#!/bin/bash
set -e

# Moonshot AI Migration Script
# Helps migrate from Claude to Moonshot AI provider

echo "🚀 Moonshot AI Migration Script"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env from .env.example first"
    exit 1
fi

# Check if Moonshot API key is set
if ! grep -q "MOONSHOT_API_KEY=" .env; then
    echo "⚠️  MOONSHOT_API_KEY not found in .env"
    echo ""
    echo "To get an API key:"
    echo "1. Visit https://platform.moonshot.cn/"
    echo "2. Sign up / Log in"
    echo "3. Navigate to API Keys section"
    echo "4. Create a new API key"
    echo ""
    read -p "Enter your Moonshot API key (or press Enter to skip): " API_KEY
    
    if [ ! -z "$API_KEY" ]; then
        echo "" >> .env
        echo "# Moonshot AI" >> .env
        echo "MOONSHOT_API_KEY=$API_KEY" >> .env
        echo "MOONSHOT_MODEL=kimi-k2.5" >> .env
        echo "✅ API key saved to .env"
    else
        echo "⏭️  Skipping API key setup"
    fi
fi

echo ""
echo "📋 Migration Options"
echo "==================="
echo ""
echo "1. Test Moonshot (keep Claude as primary)"
echo "2. Switch to Moonshot fully"
echo "3. Hybrid mode (Moonshot + local models)"
echo "4. Cost analysis only"
echo ""
read -p "Choose option (1-4): " OPTION

case $OPTION in
    1)
        echo "🧪 Testing Moonshot (Claude remains primary)"
        echo ""
        echo "This will:"
        echo "- Keep Claude as primary provider"
        echo "- Add Moonshot configuration"
        echo "- Allow testing via specific commands"
        echo ""
        
        # Keep LLM_PROVIDER as claude (or don't set it)
        if ! grep -q "LLM_PROVIDER=" .env; then
            echo "LLM_PROVIDER=claude" >> .env
        fi
        
        echo "✅ Configuration updated"
        echo ""
        echo "To test Moonshot:"
        echo "1. Restart the application: npm start"
        echo "2. In Discord/Slack:"
        echo "   @Ulf /admin check-providers"
        echo ""
        ;;
        
    2)
        echo "🔄 Switching to Moonshot fully"
        echo ""
        read -p "Are you sure? This affects all users. (y/N): " CONFIRM
        
        if [[ $CONFIRM == "y" || $CONFIRM == "Y" ]]; then
            # Update or add LLM_PROVIDER
            if grep -q "LLM_PROVIDER=" .env; then
                sed -i.bak 's/LLM_PROVIDER=.*/LLM_PROVIDER=moonshot/' .env
            else
                echo "LLM_PROVIDER=moonshot" >> .env
            fi
            
            # Set strategy to primary only
            if grep -q "LLM_STRATEGY=" .env; then
                sed -i.bak 's/LLM_STRATEGY=.*/LLM_STRATEGY=claude_only/' .env
            else
                echo "LLM_STRATEGY=claude_only" >> .env
            fi
            
            echo "✅ Moonshot is now the primary provider"
            echo ""
            echo "Next steps:"
            echo "1. Build: npm run build"
            echo "2. Restart: npm start"
            echo "3. Monitor logs for any issues"
            echo "4. Test with: @Ulf hello"
            echo ""
        else
            echo "⏭️  Cancelled"
        fi
        ;;
        
    3)
        echo "🎯 Hybrid Mode"
        echo ""
        echo "This uses:"
        echo "- Local models (Ollama) for simple tasks"
        echo "- Moonshot for complex tasks"
        echo "- Saves cost on simple queries"
        echo ""
        
        # Set provider to moonshot
        if grep -q "LLM_PROVIDER=" .env; then
            sed -i.bak 's/LLM_PROVIDER=.*/LLM_PROVIDER=moonshot/' .env
        else
            echo "LLM_PROVIDER=moonshot" >> .env
        fi
        
        # Set strategy to hybrid
        if grep -q "LLM_STRATEGY=" .env; then
            sed -i.bak 's/LLM_STRATEGY=.*/LLM_STRATEGY=hybrid/' .env
        else
            echo "LLM_STRATEGY=hybrid" >> .env
        fi
        
        echo "✅ Hybrid mode configured"
        echo ""
        echo "Make sure Ollama is running:"
        echo "  ollama serve"
        echo ""
        echo "Then restart: npm start"
        echo ""
        ;;
        
    4)
        echo "💰 Cost Analysis"
        echo ""
        
        # Check if cost auditor is running
        if ! curl -s http://localhost:9090/metrics > /dev/null 2>&1; then
            echo "⚠️  Cost auditor not running"
            echo ""
            echo "To start cost auditor:"
            echo "  cd cost-auditor/backend"
            echo "  python3 collectors/moonshot_collector.py"
            echo ""
        else
            echo "📊 Fetching current costs..."
            echo ""
            
            # Get Claude costs
            CLAUDE_COST=$(curl -s http://localhost:9090/api/v1/query?query=claude_cost_usd | grep -o '"value":\[[0-9.]*' | grep -o '[0-9.]*$' || echo "0")
            
            # Get Moonshot costs
            MOONSHOT_COST=$(curl -s http://localhost:9090/api/v1/query?query=moonshot_cost_usd | grep -o '"value":\[[0-9.]*' | grep -o '[0-9.]*$' || echo "0")
            
            echo "Current Month Costs:"
            echo "- Claude:   \$$CLAUDE_COST"
            echo "- Moonshot: \$$MOONSHOT_COST"
            echo ""
            
            if [ "$CLAUDE_COST" != "0" ]; then
                SAVINGS=$(echo "scale=2; $CLAUDE_COST - $MOONSHOT_COST" | bc)
                PERCENT=$(echo "scale=1; ($SAVINGS / $CLAUDE_COST) * 100" | bc)
                echo "💰 Savings with Moonshot: \$$SAVINGS ($PERCENT%)"
            fi
            echo ""
        fi
        
        echo "Estimated savings by switching:"
        echo ""
        echo "Scenario: 1M tokens (500k in + 500k out)"
        echo "- Claude Sonnet: ~\$15"
        echo "- Moonshot Kimi: ~\$0.50"
        echo "- Savings: ~\$14.50 (97%)"
        echo ""
        ;;
        
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📚 Additional Resources:"
echo "- Documentation: docs/moonshot-provider.md"
echo "- Test suite: npm test -- moonshot-provider.test.ts"
echo "- Platform: https://platform.moonshot.cn/"
echo ""
echo "✨ Migration script complete!"
