while true; do
  # 1. Simulate a user viewing the inventory list (GET)
  curl -s -o /dev/null http://ironstore.local/

  # 2. Simulate a user creating a random item (POST)
  RANDOM_ID=$((RANDOM % 1000))
  curl -s -o /dev/null -X POST \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"autogen-item-${RANDOM_ID}\"}" \
    http://ironstore.local/api/items

  echo "📡 Traffic packet batch sent to cluster mesh..."
  sleep 0.5 # Pause for half a second before repeating
done
