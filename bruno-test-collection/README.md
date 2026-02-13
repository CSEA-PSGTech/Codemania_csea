# Nginx Load Balancer Test Collection

This Bruno collection contains **10 code execution requests** to test the nginx load balancer at `http://localhost:3000`.

## 📦 Collection Contents

1. **01 - Simple Python Addition** - Basic input/output test
2. **02 - Python Fibonacci** - Recursive function test
3. **03 - Python String Reversal** - String manipulation
4. **04 - Python Prime Check** - Algorithm test
5. **05 - Python List Sum** - Array operations
6. **06 - Java Hello World** - Java basic I/O
7. **07 - Java Sum Two Numbers** - Java arithmetic
8. **08 - Python Factorial** - Recursion test
9. **09 - Java Array Max** - Java array operations
10. **10 - Python Palindrome Check** - String comparison

## 🚀 How to Use

### Step 1: Scale Execution Servers
```bash
cd C:\Users\shiva\Clubworks\Codemania_csea
docker compose up -d --scale execution=4
```

### Step 2: Open in Bruno
1. Open Bruno application
2. Click "Open Collection"
3. Navigate to `C:\Users\shiva\Clubworks\Codemania_csea\bruno-test-collection`
4. Select the folder

### Step 3: Run Tests
- **Single Request**: Click any request → Click "Send"
- **Run All**: Click "Run Collection" to execute all 10 requests
- **Parallel Test**: Run multiple requests simultaneously (right-click → "Send")

## 🔍 What to Look For

### Load Balancing Verification
Watch the execution server logs to see requests distributed across replicas:
```bash
docker compose logs -f execution
```

You should see different container IDs handling requests:
- `codemania_csea-execution-1`
- `codemania_csea-execution-2`
- `codemania_csea-execution-3`
- `codemania_csea-execution-4`

### Response Format
Each request returns:
```json
{
  "success": true,
  "results": [
    {
      "passed": true,
      "input": "...",
      "expectedOutput": "...",
      "actualOutput": "...",
      "executionTime": 123
    }
  ],
  "executionTime": 125,
  "port": 6001
}
```

The `port` field will always show `6001` (internal execution server port), but `docker logs` will show which replica handled it.

## ⚙️ Configuration

- **Nginx Port**: `3000`
- **Execution Secret**: `codemania-secret-key-2026` (from `.env`)
- **Timeout**: 2000ms (Python), 3000ms (Java)

## 🧪 Testing Load Distribution

Run all 10 requests rapidly and check logs:
```bash
# Terminal 1
docker compose logs -f execution

# Terminal 2 - If you want to use curl instead
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -H "X-Execution-Secret: codemania-secret-key-2026" \
  -d @01-simple-python-addition.bru
```

## 📊 Success Criteria

✅ All 10 requests return `200 OK`  
✅ All test cases pass (`"passed": true`)  
✅ Requests are distributed across multiple execution replicas  
✅ Each request completes within timeout limits  
✅ Nginx health check responds: `curl http://localhost:3000/nginx-status`

## 🐛 Troubleshooting

**401 Unauthorized**: Check `EXECUTION_SECRET` in `.env` matches the collection  
**Connection Refused**: Ensure nginx is running: `docker compose ps execution-lb`  
**Timeout**: Increase `timeLimit` in request body or scale more execution servers  
**All requests hit same replica**: Check Docker DNS resolver in nginx.conf
