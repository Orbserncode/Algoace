import requests
import json
import time

def test_backtest():
    """Test the backtesting API with the EUR/USD dataset"""
    
    # Define the backtest parameters
    backtest_params = {
        "strategy_id": "strat-ema_cross_strategy",  # Use the EMA Cross Strategy
        "symbol": "EUR/USD",                        # Use EUR/USD
        "timeframe": "1d",                          # Daily timeframe
        "start_date": "2024-01-01",                 # Start date
        "end_date": "2024-04-30",                   # End date
        "initial_capital": 10000                    # Initial capital
    }
    
    print(f"Testing backtest with parameters: {json.dumps(backtest_params, indent=2)}")
    
    # Submit the backtest job
    response = requests.post(
        "http://localhost:8000/backtesting/run",
        json=backtest_params
    )
    
    if response.status_code != 200:
        print(f"Error submitting backtest job: {response.status_code}")
        print(response.text)
        return
    
    result = response.json()
    print(f"Backtest job submitted: {json.dumps(result, indent=2)}")
    
    # If the job is queued, poll for results
    if "job_id" in result:
        job_id = result["job_id"]
        print(f"Polling for job {job_id} results...")
        
        # Poll for results (with timeout)
        max_attempts = 10
        for attempt in range(max_attempts):
            time.sleep(2)  # Wait 2 seconds between polls
            
            status_response = requests.get(
                f"http://localhost:8000/backtesting/jobs/{job_id}/status"
            )
            
            if status_response.status_code != 200:
                print(f"Error checking job status: {status_response.status_code}")
                print(status_response.text)
                continue
            
            status_result = status_response.json()
            print(f"Job status: {status_result.get('status')}")
            
            if status_result.get("status") == "COMPLETED":
                print("Backtest completed!")
                print(f"Results: {json.dumps(status_result.get('result', {}), indent=2)}")
                
                # Print the log output
                log_output = status_result.get("result", {}).get("log_output", "")
                print("\nLog output:")
                print(log_output)
                
                return
            
            if status_result.get("status") == "FAILED":
                print("Backtest failed!")
                print(f"Error: {status_result.get('error')}")
                return
        
        print(f"Timed out waiting for backtest results after {max_attempts} attempts")

if __name__ == "__main__":
    test_backtest()