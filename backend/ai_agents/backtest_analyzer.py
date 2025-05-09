"""
Backtest Analyzer for AlgoAce
"""
import json

def analyze_backtest_results(backtest_data):
    """
    Generate an AI analysis of backtest results.
    
    Args:
        backtest_data (dict): Dictionary containing backtest results data
        
    Returns:
        str: Markdown-formatted analysis of the backtest results
    """
    # For now, we'll generate a simple analysis based on the provided data
    # In a real implementation, this would call an LLM to generate the analysis
    
    strategy_id = backtest_data.get('strategy_id', 'Unknown Strategy')
    metrics = backtest_data.get('summary_metrics', {})
    trades = backtest_data.get('trades', [])
    parameters = backtest_data.get('parameters', {})
    
    # Extract key metrics
    net_profit = metrics.get('netProfit', 0)
    win_rate = metrics.get('winRate', 0) * 100
    profit_factor = metrics.get('profitFactor', 0)
    max_drawdown = metrics.get('maxDrawdown', 0) * 100
    sharpe_ratio = metrics.get('sharpeRatio', 0)
    sortino_ratio = metrics.get('sortinoRatio', 0)
    total_trades = metrics.get('totalTrades', 0)
    
    # Analyze performance
    performance_rating = "Poor"
    if profit_factor > 2 and win_rate > 60:
        performance_rating = "Excellent"
    elif profit_factor > 1.5 and win_rate > 55:
        performance_rating = "Good"
    elif profit_factor > 1.2 and win_rate > 50:
        performance_rating = "Average"
    
    # Analyze risk
    risk_rating = "High"
    if max_drawdown < 10 and sharpe_ratio > 1.5:
        risk_rating = "Low"
    elif max_drawdown < 20 and sharpe_ratio > 1:
        risk_rating = "Medium"
    
    # Count winning and losing trades
    winning_trades = sum(1 for trade in trades if trade.get('pnl', 0) > 0)
    losing_trades = sum(1 for trade in trades if trade.get('pnl', 0) <= 0)
    
    # Generate analysis
    analysis = f"""
# Backtest Analysis for {strategy_id}

## Summary
This analysis examines the performance of the **{strategy_id}** strategy on **{parameters.get('symbol', 'Unknown')}** with a **{parameters.get('timeframe', 'Unknown')}** timeframe from **{parameters.get('startDate', 'Unknown')}** to **{parameters.get('endDate', 'Unknown')}**.

Overall Performance Rating: **{performance_rating}**  
Risk Rating: **{risk_rating}**

## Key Metrics
- Net Profit: **${net_profit:.2f}**
- Win Rate: **{win_rate:.2f}%**
- Profit Factor: **{profit_factor:.2f}**
- Max Drawdown: **{max_drawdown:.2f}%**
- Sharpe Ratio: **{sharpe_ratio:.2f}**
- Sortino Ratio: **{sortino_ratio:.2f}**
- Total Trades: **{total_trades}** ({winning_trades} winning, {losing_trades} losing)

## Performance Analysis
"""

    # Add performance analysis based on metrics
    if net_profit > 0:
        analysis += f"The strategy was profitable with a net profit of ${net_profit:.2f}. "
    else:
        analysis += f"The strategy was not profitable, with a net loss of ${abs(net_profit):.2f}. "
    
    if win_rate > 60:
        analysis += f"With a high win rate of {win_rate:.2f}%, the strategy shows good consistency in generating winning trades. "
    elif win_rate > 50:
        analysis += f"The win rate of {win_rate:.2f}% is above 50%, indicating a slight edge in the strategy. "
    else:
        analysis += f"The win rate of {win_rate:.2f}% is below 50%, suggesting the strategy relies on larger winning trades to offset more frequent losses. "
    
    if profit_factor > 2:
        analysis += f"The profit factor of {profit_factor:.2f} is excellent, indicating the strategy generates more than twice as much profit as loss. "
    elif profit_factor > 1.5:
        analysis += f"The profit factor of {profit_factor:.2f} is good, showing the strategy generates significantly more profit than loss. "
    elif profit_factor > 1:
        analysis += f"The profit factor of {profit_factor:.2f} is above 1, indicating the strategy is profitable but with a smaller margin. "
    else:
        analysis += f"The profit factor of {profit_factor:.2f} is below 1, indicating the strategy is not profitable in the long run. "
    
    analysis += "\n\n## Risk Analysis\n"
    
    if max_drawdown < 10:
        analysis += f"The maximum drawdown of {max_drawdown:.2f}% is low, indicating good risk management. "
    elif max_drawdown < 20:
        analysis += f"The maximum drawdown of {max_drawdown:.2f}% is moderate and within acceptable limits for most trading strategies. "
    else:
        analysis += f"The maximum drawdown of {max_drawdown:.2f}% is high, suggesting potential risk management issues. "
    
    if sharpe_ratio > 1.5:
        analysis += f"The Sharpe ratio of {sharpe_ratio:.2f} is excellent, indicating good risk-adjusted returns. "
    elif sharpe_ratio > 1:
        analysis += f"The Sharpe ratio of {sharpe_ratio:.2f} is good, showing reasonable risk-adjusted returns. "
    else:
        analysis += f"The Sharpe ratio of {sharpe_ratio:.2f} is below ideal levels, suggesting the returns may not adequately compensate for the risk taken. "
    
    if sortino_ratio > 1.5:
        analysis += f"The Sortino ratio of {sortino_ratio:.2f} is excellent, indicating good returns relative to downside risk. "
    elif sortino_ratio > 1:
        analysis += f"The Sortino ratio of {sortino_ratio:.2f} is good, showing reasonable returns relative to downside risk. "
    else:
        analysis += f"The Sortino ratio of {sortino_ratio:.2f} is below ideal levels, suggesting the strategy may have too much downside risk relative to returns. "
    
    analysis += "\n\n## Recommendations\n"
    
    # Add recommendations based on analysis
    if performance_rating == "Poor":
        analysis += "- Consider revising or abandoning this strategy due to poor performance metrics.\n"
        analysis += "- If pursuing further, focus on improving the win rate and reducing the average loss per trade.\n"
    
    if risk_rating == "High":
        analysis += "- Implement stronger risk management controls to reduce the maximum drawdown.\n"
        analysis += "- Consider using smaller position sizes to mitigate risk.\n"
    
    if win_rate < 50:
        analysis += "- Review entry criteria to improve the accuracy of trade signals.\n"
    
    if profit_factor < 1.5:
        analysis += "- Optimize exit strategies to let winners run longer and cut losers shorter.\n"
    
    # Add general recommendations
    analysis += "- Consider testing the strategy on different timeframes or instruments to assess robustness.\n"
    analysis += "- Perform walk-forward testing to validate the strategy's performance on out-of-sample data.\n"
    analysis += "- Evaluate the strategy's performance during different market conditions (trending vs. ranging).\n"
    
    return analysis