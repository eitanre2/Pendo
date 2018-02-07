# Pendo Voting API

## Features
This api provides the following features:
- Create new Post (title & body)
- Get exists Post (by postId)
- Update post (its title & body, by postId)
- upVote/downVote a post. Once per user.
- Get Top-Posts, by votes and last period of time

## Installation
The install script wil install rethinkDb, nodejs and few npm packages.

- clone the repository
- run:
$ chmod +x install.sh
$ ./install.sh


## What is missing
- Docker or any other packaging method.
- Authentication. for now only by dummy header
- Benchmark for scale, and other technologies
- TODO.md file

## General API Usage
An example commands:

### Create Post
```
$ curl localhost:8080/posts -XPUT -s -d '{"title":"myTitle111", "body":"myBody111"}' -H "content-type:application/json" -H "Authorization:1" | jq '.'
```

### Get Post
```
$ curl localhost:8080/posts/1 -XGET -s -H "content-type:application/json" -H "Authorization:1" | jq '.'
```

more examples in the folder scripts/


