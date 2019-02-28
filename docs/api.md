# API
## Parameters

All parameters should be sent over as JSON unless including media (e.g. picture), in which case it is to be sent over as a multi-part form.

In addition, when cookies are required, use axios to send the cookie over as follows:

```js
// for a single request
axios.get('/foo', { withCredentials: true })
axios.post('/bar', data, { withCredentials: true })
```

The above pattern gets more complicated if you want to include credentials *by default* and get server-side error messages back (Google is your friend).

Additionally, we expect some parameters to be checked before they're submitted to the backend!

For users:

- `username`: must be between 1 and 15 characters long, can only contain `\w` (i.e. letters, numbers, `_`, `-`)
- `password`: must be at least 9 characters long
- `email`: must be a valid email format
- `name`: at max 30 characters long
- `location`: at max 50 characters long
- `bio`: at max 140 characters long

For arts:

- `title`: must be between 1 and 140 characters long
- `description`: can be at most 500 characters long
- `pictures`: array of at most 4 pictures (each picture is at max 100MB in size)
- `price`: at least 0. We're not bothering with units atm
- `medium`: at most 30 characters long

See `.env.example` of the backend repo for these values.

Finally, anything of form `:var` is a URL parameter, and they should always be non-empty. For example, if a route calls for `/foo/:bar`, sending a request to `/foo/baz` is ok whereas `/foo` is not.

## Routes

This API uses a REST design - that means each endpoint exposes a single "resource" - users, pictures, etc. When a 
request is successful, it returns a status code <300, and when there's resource(s) to return, it returns a JSON 
object representing the resource(s) that you can access via `response.data` when using `axios`.

- [POST `/sessions`](#login)
- [DELETE `/sessions`](#logout)
- [GET `/users/:userId`](#me)
- [GET `/users/:userId/arts`](#myart)
- [POST `/users`](#createuser)
- [PATCH `/users/verify/:token`](#verifyuser)
- [PATCH `/users/reset`](#requestreset)
- [PATCH `/users/reset/:token`](#passwordreset)
- [GET `/arts`](#discover)
- [GET `/arts/:artId`](#getart)
- [POST `/arts`](#createpicture)
- [GET `/commissions`](#cboard)
- [GET `/commissions/:commissionId`](#getc)
- [GET `/commissions/forMe`](#getcme)
- [POST `/commissions`](#makec)
- [GET `/negotiations`](#neg)
- [GET `/negotiations/:artistName`](#negart)
- [POST `/negotiations/`](#negpost)
- [PATCH `/negotiations/:artistName`](#negpatch)

### <a name="login"></a>POST `/sessions`
This endpoint is used to login existing users. Params `username` and `password` are expected. On success, returns status code 201 with a cookie. Also returns an instance of the user object.

### <a name="logout"></a>DELETE `/sessions`

This endpoint is used to logout users who are already logged in. On success, returns status code 204.

### <a name="me"></a>GET `/users/:userId`

Returns user information corresponding to the `userId`. One of the components that would be included in a "user profile".

### <a name="myart"></a>GET `/users/:userId/arts`

Returns all of the art for a user. Also used for profile. Optionally can pass an `after` for pagination.

### <a name="createuser"></a>POST `/users`

This endpoint is used to create a user. Params `username`, `email`, and `password` are expected. On success, returns status code 201 with a JSON object representing the user, which contains the fields `id`, `email`, `username`, and `verified`.

Additionally, an email is sent out to the user's email asking for verification containing a link to `/users/verify/:token` when their account is created successfully.

### <a name="verifyuser"></a>PATCH `/users/verify/:token`

When a user accesses a page of form `/users/verify/:token`, a PATCH request should be sent to this endpoint (containing the exact same `:token` value) to verify the user's email address. On success, returns status code 200, at which point the user should be redirected to a login page (front-end routing).

### <a name="requestreset"></a>PATCH `/users/reset`

This endpoint is used to request a password reset in case a user forgot it. Param `email` is expected. On success, returns a 200 and sends out an email with the password reset link of form `/users/reset/:token`.

### <a name="passwordreset"></a>PATCH `/users/reset/:token`

When a user accesses a page of form `/users/reset/:token`, a PATCH request should be sent to this endpoint (containing the exact same `:token` value) to reset the user's password. Param `password` is expected (the new password). On success, returns a 200.

### <a name="discover"></a>GET `/arts`

This is the "discover page". Currently, it returns the most recent pictures in anti-chronological order.

It returns a maximum of 15 pictures. If you want to load more, you can include the `after` parameter indicating the `id` of the last seen picture (i.e. the `id` of the last object in the pictures array returned).

### <a name="getart"></a> GET `/arts/:artId`

Get a single art by id.

### <a name="createpicture"></a>POST `/arts`

This endpoint is used to upload a picture. The request body should be sent as multi-part form data, instead of JSON. Params `title` and `picture` are expected (you are required to upload at least 1 picture), and you can optionally also pass `description` (from which hashtags are parsed), `price`, and `medium`. The `pictures` field should contain the picture file(s).

Upon success, returns a 201 with a JSON object representing the user, which contains the fields `id`, `title`, `description`,  `pictures`, `price`, `tags`, and `artist_id`. The `pictures` array contain links to the pictures in the art.

You are required to pass user information (i.e. user must be logged in and you gotta send over a cookie) since the art created is linked to that user!

### <a name="cboard"></a>GET `/commissions`

This is the commission board. Currently, it returns the most recent commissions in anti-chronological order.

It returns a maximum of 15 commissions. If you want to load more, you can include the `after` parameter indicating the `id` of the last seen commission (i.e. the `id` of the last object in the commissions array returned).

### <a name="getc"></a>GET `/commissions/:commissionId`

Get a single commission by `id`

### <a name="getcme"></a>GET `/commissions/forMe`

Get all the commisions related to a user. This request must contain a query appended to the end of the url. This query has one param `as` which contains the value of artist or buyer depending on which types of commissions you are trying to look at. `/me/?as=artist` 

For artist commissions, a second parameter, `show` must also be included with the value 'all' if you want to view rejected commissions or `current` if you want to exclude these commissions. `/me/?as=artist&show=all`

You are required to pass user information (i.e. user must be logged in and you gotta send over a cookie) since the art created is linked to that user!

### <a name="makec"></a>POST `/commissions`

Create a commissions object. Required fields are `price`, `deadline`, `copyright`, `description`.  Successful posting returns a error 201 code and a JSON object representing the commission.

You are required to pass user information (i.e. user must be logged in and you gotta send over a cookie) since the art created is linked to that user!


### <a name="neg"></a>GET `/negotiations`



### <a name="negart"></a>GET `/negotiations/:artistName`



### <a name="negpost"></a>POST `/negotiations`


### <a name="negpatch"></a>PATCH `/negotiations/:artistName`



## Errors

The API, on error, will return a status code (`error.response.status`) and an error message (`error.response.data`). The error message should be relayed to the user.

When a request is malformed (e.g. wrong/missing parameters), returns a 400 status code.

When a route and/or a resource is not found, returns a 404 status code.

When there was a conflict in one of the parameters (e.g. username/email is already taken), returns a 409 status code.

If there was a server-side error, it will return a 500 status code.