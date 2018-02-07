# very basic test
curl localhost:8080/Test -s 
echo 
echo



echo "get post #1 (doesn't exist yet)"
curl localhost:8080/posts/1 -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "Create post #1"
curl localhost:8080/posts -XPUT -s -d '{"title":"myTitle111", "body":"myBody111"}' -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "get post #1 (should be exist)"
curl localhost:8080/posts/1 -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "get top posts (Only one)"
curl localhost:8080/posts/top -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "create post #2 "
curl localhost:8080/posts -XPUT -s -d '{"title":"myTitle222", "body":"myBody222"}' -H "content-type:application/json" -H "Authorization:1" | jq '.'


echo "Get top posts (2 posts, the #1 should be first)"
curl localhost:8080/posts/top -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "create post #3 "
curl localhost:8080/posts -XPUT -s -d '{"title":"myTitle333", "body":"myBody333"}' -H "content-type:application/json" -H "Authorization:1" | jq '.'

echo "up-vote to post 3 (by different users) "
curl localhost:8080/posts/2/up -XGET -s -H "content-type:application/json" -H "Authorization:10" | jq '.'
curl localhost:8080/posts/2/up -XGET -s -H "content-type:application/json" -H "Authorization:20" | jq '.'
curl localhost:8080/posts/2/up -XGET -s -H "content-type:application/json" -H "Authorization:30" | jq '.'

echo "up-vote to post 3 (by same user. should be rejected) "
curl localhost:8080/posts/2/up -XGET -s -H "content-type:application/json" -H "Authorization:10" | jq '.'


echo "Get top posts (2 posts, the #3 should be first)"
curl localhost:8080/posts/top -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'

