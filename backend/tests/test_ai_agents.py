import pytest
from unittest.mock import patch, MagicMock, mock_open, AsyncMock
import os
import httpx # For mock_dependencies and type hinting
from sqlmodel import Session # For mock_db_session
from datetime import datetime, timedelta # For date calculations in tests

# Models and Schemas
from backend.models.agent import Agent as AgentModel, AgentTypeEnum
from backend.schemas import (
    StrategyCodingAgentConfig, 
    BacktestAnalyzerAgentConfig, 
    AgentConfigUnion,
    GenerateStrategyInput, # Corrected: This is an input schema, not from strategy_coding_agent directly
    # GeneratedStrategyCode, # This is a Pydantic model defined in strategy_coding_agent
    # BacktestAnalysisInput, # Defined in backtest_analyzer
    # BacktestAnalysisOutput # Defined in backtest_analyzer
)
from backend.ai_agents.strategy_coding_agent import StrategyCodingAIAgent, GeneratedStrategyCode # GeneratedStrategyCode is here
from backend.ai_agents.backtest_analyzer import BacktestAnalyzerAIAgent, BacktestAnalysisInput, BacktestAnalysisOutput # Inputs/Outputs are here
from backend.models.backtest import BacktestResult
from backend.ai_agents.base_agent import AgentDependencies
# from pydantic_ai import Agent as PydanticAICoreAgent # For mocking, if needed for PydanticAI Core agent

# Mock SQLModel Session
mock_db_session = MagicMock(spec=Session)

# Default configs - ensure these use fields defined in the Pydantic models
default_strategy_coding_config = StrategyCodingAgentConfig(
    agent_type='Strategy Coding Agent', # Literal value
    generationPrompt="Test prompt for coding",
    llmModelProviderId="test_provider_coder",
    llmModelName="test_model_coder"
)
default_backtest_analyzer_config = BacktestAnalyzerAgentConfig(
    agent_type='Backtest Analyzer Agent', # Literal value
    analysisPrompt="Analyze {summary_metrics} for analyzer",
    llmModelProviderId="test_provider_analyzer",
    llmModelName="test_model_analyzer"
)

@pytest.fixture
def mock_agent_model_factory():
    def _factory(agent_type: AgentTypeEnum, config: AgentConfigUnion):
        # Ensure config is a dict before assignment, as AgentModel expects Dict[str, Any]
        config_dict = config.model_dump() if hasattr(config, 'model_dump') else config
        return AgentModel(
            id=1,
            name=f"{agent_type.value} Test Agent",
            type=agent_type, # This should be the Enum member, not its value for SQLModel
            description="Test agent description",
            config=config_dict 
        )
    return _factory

@pytest.fixture
def mock_dependencies_fixture(): # Renamed to avoid clash if a variable 'mock_dependencies' is used
    mock_async_client = MagicMock(spec=httpx.AsyncClient)
    # mock_pydantic_core_agent = MagicMock(spec=PydanticAICoreAgent) # Example if core agent needed mocking

    # Patch get_llm_client which is called inside PydanticAIAgent's __init__
    # This client is then used to initialize AgentDependencies internally by PydanticAIAgent
    with patch('backend.ai_agents.base_agent.get_llm_client', return_value=mock_async_client) as mock_get_llm:
        deps = AgentDependencies(
            client=mock_async_client, 
            database_session=mock_db_session
            # api_keys, etc., can be added if needed by agents under test
        )
        # Yield or return? If agents re-initialize dependencies or get_llm_client is called multiple times,
        # managing the patch context might be important. For now, assume it's called once per agent init.
    return deps, mock_get_llm # Return mock_get_llm to assert calls if needed

# --- Tests for BacktestAnalyzerAIAgent ---
@pytest.mark.asyncio
async def test_backtest_analyzer_run_with_direct_metrics(mock_agent_model_factory, mock_dependencies_fixture):
    mock_deps, _ = mock_dependencies_fixture # Unpack, ignore the get_llm_client mock for now
    agent_model = mock_agent_model_factory(AgentTypeEnum.BACKTEST_ANALYZER, default_backtest_analyzer_config)
    
    # PydanticAIAgent.__init__ calls get_llm_client. Patch it for the duration of agent instantiation.
    with patch('backend.ai_agents.base_agent.get_llm_client', return_value=MagicMock(spec=httpx.AsyncClient)):
        analyzer_agent = BacktestAnalyzerAIAgent(agent_model, mock_db_session) # Session for init
    
    # Manually set the dependencies to our controlled mock after agent initialization
    analyzer_agent.dependencies = mock_deps 
    # Ensure the agent's internal llm_client (if used directly, not via PydanticAICoreAgent) is also the one from deps
    analyzer_agent.llm_client = mock_deps.client 


    test_metrics = {"netProfit": 1000, "winRate": 0.6, "totalTrades": 50, "maxDrawdown": 0.1}
    task_input = BacktestAnalysisInput(summary_metrics=test_metrics)

    # Mock the _update_agent_stats method
    analyzer_agent._update_agent_stats = MagicMock()

    result = await analyzer_agent.run(task_input)

    assert result.success
    assert "profitable" in result.analysis_text.lower()
    assert "win rate of 60.00%" in result.analysis_text
    assert result.analyzed_metrics == test_metrics
    analyzer_agent._update_agent_stats.assert_called_once_with(success=True, session=mock_deps.database_session)

@pytest.mark.asyncio
@patch('backend.crud_backtest.get_backtest_result')
async def test_backtest_analyzer_run_with_id(mock_get_backtest_result_crud, mock_agent_model_factory, mock_dependencies_fixture):
    mock_deps, _ = mock_dependencies_fixture
    agent_model = mock_agent_model_factory(AgentTypeEnum.BACKTEST_ANALYZER, default_backtest_analyzer_config)
    
    with patch('backend.ai_agents.base_agent.get_llm_client', return_value=MagicMock(spec=httpx.AsyncClient)):
        analyzer_agent = BacktestAnalyzerAIAgent(agent_model, mock_db_session)
    analyzer_agent.dependencies = mock_deps
    analyzer_agent.llm_client = mock_deps.client

    test_metrics = {"netProfit": -200, "winRate": 0.3, "totalTrades": 5, "maxDrawdown": 0.25}
    # Ensure BacktestResult is initialized with all required fields if it has validators
    mock_db_result = BacktestResult(
        id=1, 
        strategy_id="s1", 
        summary_metrics=test_metrics, 
        equity_curve=[], 
        trades=[], 
        log_output="",
        timestamp=datetime.now(), # Add timestamp
        parameters={} # Add parameters
    )
    mock_get_backtest_result_crud.return_value = mock_db_result
    
    task_input = BacktestAnalysisInput(backtest_result_id=1)
    analyzer_agent._update_agent_stats = MagicMock() # Mock stats update
    result = await analyzer_agent.run(task_input)

    assert result.success
    assert "not profitable" in result.analysis_text.lower()
    assert "win rate of 30.00%" in result.analysis_text
    assert "number of trades is very low" in result.analysis_text.lower()
    mock_get_backtest_result_crud.assert_called_once_with(session=mock_deps.database_session, backtest_id=1)
    analyzer_agent._update_agent_stats.assert_called_once_with(success=True, session=mock_deps.database_session)

@pytest.mark.asyncio
@patch('backend.crud_backtest.get_backtest_result')
async def test_backtest_analyzer_run_id_not_found(mock_get_backtest_result_crud_not_found, mock_agent_model_factory, mock_dependencies_fixture):
    mock_deps, _ = mock_dependencies_fixture
    agent_model = mock_agent_model_factory(AgentTypeEnum.BACKTEST_ANALYZER, default_backtest_analyzer_config)

    with patch('backend.ai_agents.base_agent.get_llm_client', return_value=MagicMock(spec=httpx.AsyncClient)):
        analyzer_agent = BacktestAnalyzerAIAgent(agent_model, mock_db_session)
    analyzer_agent.dependencies = mock_deps
    analyzer_agent.llm_client = mock_deps.client

    mock_get_backtest_result_crud_not_found.return_value = None # Simulate not found
    
    task_input = BacktestAnalysisInput(backtest_result_id=99)
    analyzer_agent._update_agent_stats = MagicMock() # Mock stats update
    result = await analyzer_agent.run(task_input)

    assert not result.success
    assert "not found" in result.message.lower()
    mock_get_backtest_result_crud_not_found.assert_called_once_with(session=mock_deps.database_session, backtest_id=99)
    analyzer_agent._update_agent_stats.assert_not_called() # Stats should not be updated on this failure

# --- Tests for StrategyCodingAIAgent ---
# Note: StrategyCodingAIAgent's run method takes only 'task_input', session is from dependencies
@pytest.mark.asyncio
@patch('backend.ai_agents.strategy_coding_agent.crud.create_strategy') # Path to crud used within strategy_coding_agent.py
@patch('builtins.open', new_callable=mock_open)
@patch('os.makedirs')
# Patch the 'post' method of the httpx.AsyncClient that will be in dependencies
async def test_strategy_coding_agent_run_success(
    mock_os_makedirs, mock_file_open, mock_crud_create_strategy, 
    mock_agent_model_factory, mock_dependencies_fixture
):
    mock_deps, mock_get_llm = mock_dependencies_fixture # Get the shared AsyncClient and the get_llm_client patch

    # We need self.dependencies.client.post to be a mock.
    # mock_dependencies_fixture already creates mock_deps.client as a MagicMock(spec=httpx.AsyncClient)
    # So, we can make its 'post' method an AsyncMock.
    mock_deps.client.post = AsyncMock() # Make the post method an AsyncMock

    agent_model = mock_agent_model_factory(AgentTypeEnum.STRATEGY_CODING, default_strategy_coding_config)
    
    # PydanticAIAgent.__init__ calls get_llm_client.
    # The mock_dependencies_fixture already patches this, but let's ensure the context for this specific agent.
    # The client instance created by get_llm_client will be used by the agent to form its self.dependencies.client
    with patch('backend.ai_agents.base_agent.get_llm_client', return_value=mock_deps.client):
        coder_agent = StrategyCodingAIAgent(agent_model, mock_db_session) # Session for init
    
    # Ensure the agent uses our controlled dependencies, particularly the client with the mocked 'post'
    coder_agent.dependencies = mock_deps
    # Also, PydanticAIAgent's __init__ creates self.pydantic_agent which might capture self.dependencies.client
    # For full control, if _create_pydantic_agent uses self.dependencies.client, this should be fine.
    # If it re-fetches or uses self.llm_client directly for PydanticAICoreAgent, ensure self.llm_client is also the mock_deps.client
    coder_agent.llm_client = mock_deps.client 
    # And re-create pydantic_agent if it captured the original client from the initial PydanticAIAgent.__init__
    coder_agent.pydantic_agent = coder_agent._create_pydantic_agent()


    # Mock LLM response from Pydantic AI Core Agent (instructor)
    mock_llm_output = GeneratedStrategyCode(
        file_name="test_strat.py", 
        python_code="print('hello strategy')", 
        description="A test strategy description"
    )
    # The agent uses self.instructor which is self.pydantic_agent
    # So, mock self.pydantic_agent.chat.completions.create
    coder_agent.pydantic_agent.chat.completions.create = AsyncMock(return_value=mock_llm_output)

    # Mock DB creation
    mock_db_strategy = MagicMock() # Simulate the DB model object
    mock_db_strategy.name = "Test Strat From DB" # Ensure it has attributes accessed later
    mock_db_strategy.id = 123
    mock_crud_create_strategy.return_value = mock_db_strategy

    # Mock backtest API response for client.post
    mock_backtest_api_response = MagicMock(spec=httpx.Response) # Use spec for httpx.Response
    mock_backtest_api_response.status_code = 200
    mock_backtest_api_response.json.return_value = {"jobId": "job-test-789"}
    # mock_dependencies_fixture.client.post.return_value = mock_backtest_api_response
    # The above line should be:
    coder_agent.dependencies.client.post.return_value = mock_backtest_api_response


    task_input = GenerateStrategyInput(market_conditions="bullish", risk_tolerance="low", target_asset_class="stocks")
    coder_agent._update_agent_stats = MagicMock() # Mock stats update
    
    result = await coder_agent.run(task_input)

    assert result.success
    mock_os_makedirs.assert_called_once_with("backend/strategies/generated", exist_ok=True)
    # Use os.path.join for path construction to be OS-agnostic in assertion
    expected_file_path = os.path.join("backend/strategies/generated", "test_strat.py")
    mock_file_open.assert_called_once_with(expected_file_path, "w")
    mock_file_open().write.assert_called_once_with("print('hello strategy')")
    
    mock_crud_create_strategy.assert_called_once() # Basic check, can add more detail on args
    
    expected_backtest_payload_params = {
        "startDate": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
        "endDate": datetime.now().strftime("%Y-%m-%d"),
        "initialCapital": 10000.0,
        "symbol": "AAPL", 
        "timeframe": "1D"
    }
    # Check the call to the mocked post method on the client instance
    coder_agent.dependencies.client.post.assert_called_once()
    args, kwargs = coder_agent.dependencies.client.post.call_args
    assert args[0] == "http://localhost:8000/backtesting/run" 
    assert kwargs['json']['strategy_id'] == "strat-generated.test_strat" # From file_name "test_strat.py"
    assert kwargs['json']['parameters'] == expected_backtest_payload_params
    
    assert "Backtest initiated with Job ID: job-test-789" in result.message
    coder_agent._update_agent_stats.assert_called_once_with(success=True, session=mock_deps.database_session)

# Placeholder for other tests if needed
# @pytest.mark.asyncio
# async def test_strategy_coding_agent_llm_failure(...):
#     pass

# @pytest.mark.asyncio
# async def test_strategy_coding_agent_file_save_failure(...):
#     pass

# @pytest.mark.asyncio
# async def test_strategy_coding_agent_backtest_api_failure(...):
#     pass
    
# Ensure all necessary imports from unittest.mock are present
# from unittest.mock import patch, MagicMock, mock_open, AsyncMock (already there)
# Ensure httpx is available for tests (add to dev dependencies)
# import httpx (already there)
# Ensure sqlmodel.Session is imported for mock_db_session typing
# from sqlmodel import Session (already there)
# Ensure datetime and timedelta are imported
# from datetime import datetime, timedelta (already there)
# Ensure AgentTypeEnum, specific configs, and AgentConfigUnion are imported
# from backend.models.agent import AgentTypeEnum (already there)
# from backend.schemas import StrategyCodingAgentConfig, BacktestAnalyzerAgentConfig, AgentConfigUnion (already there)
# Ensure agent classes and their specific I/O schemas are imported
# from backend.ai_agents.strategy_coding_agent import StrategyCodingAIAgent, GenerateStrategyInput, GeneratedStrategyCode (partially, fixed)
# from backend.ai_agents.backtest_analyzer import BacktestAnalyzerAIAgent, BacktestAnalysisInput, BacktestAnalysisOutput (partially, fixed)
# Ensure BacktestResult and AgentDependencies are imported
# from backend.models.backtest import BacktestResult (already there)
# from backend.ai_agents.base_agent import AgentDependencies (already there)
# Ensure AgentModel is imported
# from backend.models.agent import Agent as AgentModel (already there)
# For PydanticAICoreAgent, if needed for mocking
# from pydantic_ai import Agent as PydanticAICoreAgent (commented out, not directly used yet)
