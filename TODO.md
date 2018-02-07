Put here thoughts, Ideas, Corners etc..

#Questions
- Top Posts is the posts for the last created posts, ordered by score DESC

# Users
- login/Identidy part is missing
- userId format. For now it's number to simplify.
- No security is implemented so any user can see or vote any post.
  Updating a post is limited only to creator user.
- 


# General
- create Classes for Post, ScoredPost.
- defined error codes in controller.
- validate request json (validate-my-schema)
- make sure rethinkDb client keep connection, otherwise create connection every request
- use async, parallel instead of canonial calls.. (especially in tests)


# Edge Corner
- timing - fast user can vote twice (between the checks)

