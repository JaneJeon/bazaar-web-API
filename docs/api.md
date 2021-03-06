# API Documentation

## REST API

A REST API exposes resources over various endpoints. This one exposes the resources `User`, `Art`, `Commission`, `Negotiation`, and `Chat` over HTTP endpoints.

A resource can be manipulated via the combination of an HTTP _verb_ (`GET`/`POST`/`PATCH`/`DELETE`) and an endpoint (e.g. `/arts/:artId`).

In the endpoints, anything of form `:var` is a URL parameter, and they should always be non-empty. For example, if a route calls for `/foo/:bar`, sending a request to `/foo/baz` is ok whereas `/foo` is not.

`GET` methods are _read-only_, meaning they cannot change any resources. Rather, `GET` methods return _resources_ specified by the endpoint (e.g. `GET /arts` return an array of `Art` objects whereas `GET /arts/:artId` returns the `Art` object with the specified `:artId`, if any exists).

In general, any `GET` request that returns a list will support paginating via specifying the query parameter `after`. For example, `GET /arts` will return the first 15 results, and suppose the `id` for the last item is 42. Then, `GET /arts?after=15` would return the next 15 results, and so on.

`POST` methods _create_ resources with their request body, which can be either JSON or a multi-part form data. For example, `POST /users` creates a user. Use JSON unless if the route supports uploading a file (e.g. `POST /users` supports uploading avatars, so you must use multi-part even when you aren't uploading an avatar). In the response to a `POST` request, the API will return the created resource.

`PATCH` methods _update_ resources. The request body specifies what and how exactly to update the resource (e.g. `{ name: "Joe Shmoe" }` changes the name, and `{ avatar: null }` unsets avatar). In the response to a `PATCH` request, the API will return the updated resource.

`DELETE` methods _delete_ resources. To do so, you would need to specify the resource to be deleted via the endpoint (e.g. `DELETE /arts/1`).

Some endpoints will require that a user be logged in. In that case, you must send over a valid JWT (which are generated as a response to login/signup/any action that modifies the user object) for the request to be valid. Note, however, that signing out or changing the user object (any PATCH routes or stripe routes) invalidates ALL tokens except for the token that is freshly generated (and returned).

In addition, JWTs can be decoded (WITHOUT needing the key that was used to sign it!) from the frontend to reveal the user object. And they must be sent as _bearer tokens_ - please google it!

And finally, each resource has some degree of access control - while some resources may allow them to be read publicly, some only allow a few people to even access the resource. In general, only the creator has read/write access.

### Errors

The API, on error, will return a JSON object with the status code, the error name, and the message. The error message should be relayed to the user, and the frontend should take actions depending on the status code/error name.

When a request is malformed (e.g. wrong/missing parameters), returns a 400 status code.

When a request isn't authenticated (i.e. missing cookie), returns a 401.

When a route and/or a resource is not found, returns a 404 status code. This can also happen when a resource does exist but the requester does not have access to it.

In addition, in case of nested resources (e.g. `/users/:userId/arts`), if the parent resource specified by the id (in this case, the `:userId`) does not exist, it will throw a 404.

In general, routes that specify a _single_ resource will throw a 404 when not found, and routes that specify a _list_ of resources will simply return an empty array when not found.

When there was a conflict in one of the parameters (e.g. username/email is already taken), returns a 409 status code.

If there was a server-side error, it will return a 500 status code.

## Resources

You can see what each resource _looks like_ by going to the `models` folders and looking at the class representing the resource. For example, to look at what a `User` looks like, you can look for `static get jsonSchema()` in `models/user.js`.

The actual `jsonSchema` should be trivial to understand, but if you're unsure what some of the attribute-specific keywords mean (such as the `pattern: "^\\w+$"`), please see [here](https://json-schema.org/understanding-json-schema/reference/type.html). For the environment variables (e.g. `process.env.MIN_USERNAME_LENGTH`), please see `.env.defaults`.

Ideally, you would do front-end validation based on these `jsonSchema` specifications before you send over any data to the backend.

However, not all attributes listed in the `jsonSchema` are meant to be set by the frontend. For example, each resource has the fields `createdAt` and `updatedAt` that is set automatically each time you interact with the resource.

To see which fields you can't set via `POST` requests (but remember - you _can_ read all attributes of any resource that the API returns, minus `password`), see `reservedPostFields` in the resource class.

To see which fields you can't set via `PATCH` requests, check the property `reservedPatchFields` in the resource class, or if it doesn't exist, the `reservedPostFields` property.

### User

The user's `id` is simply its `username` lowercased to guarantee uniqueness. Neither the `id` and `username` can be changed after being set, so it allows the frontend to link to a user by name, rather than some random number.

A user's `avatar` is a link that defaults to the gravatar specified by their `email` akin to this:

<img src="https://gravatar.com/avatar/870c9fb319dc8955c1ca0fcc68592f0d?s=200&d=retro"></img>

However, a user may choose to upload an avatar, in which case their `avatar` will be replaced by the link to the picture they uploaded. When a user deletes their `avatar`, it will once again default to the gravatar.

For purposes of preservation, when a user deletes their account, their account is marked as `deleted` _but_ their actual account resource is not deleted. This allows the frontend to distinguish between active accounts and closed accounts when displaying art, for example.

And when a user is first created, the user is not `verified`, and so they cannot create art/commission/negotiation until they verify their account. The frontend should read this value and nudge the user to verify their account whenever possible.

A user can also possess one of three `roles`. These are `user`, `admin`, and `superuser`. A newly created account is defaults to being a `user`. However, in order to access or view reports, a user must be an `admin` or a `superuser`.

The default seeded users all have the password 123456789

### Art

An art can have 1-4 `pictures` attached to it. However, the `pictures` may not be changed after upload.

If the art has a `description`, `tags` will be automatically extracted from it - no need to specify the `tags` yourself!

The art does have a `priceUnit`; however, for now the only possible value for this field is "USD" (and it is the default value for the field).

`GET` operations return additional fields: `likes` counting the number of likes the art has, and `liked` (an integer, but you can use it as a boolean since 0 is falsey and 1 is truthy in javascript) indicating whether the current user (if the user is signed in) liked the art. If the user is not signed in, `liked` is always 0. And finally, `artistAvatar` is the `avatar` property of the artist.

### Commission

When a buyer creates a commission, they can specify an artist of their choosing. Whenever a commission specifies an artist (and `artistId` can actually be set even after the commission is created as a public commission), it will be turned into a private commission.

Once an `artistId` is set, you cannot change it or delete it again.

The `deadline` is a date (of format `YYYY-MM-DD`), not a datetime/timestamp, and it is specified in the UTC timezone.

`GET` operations return additional fields: `artistAvatar` is the `avatar` property of the artist (may be null), and `buyerAvatar` is the `avatar` property of the buyer.

### Negotiation

A commission can have multiple ongoing negotiations with different artists. When an artist makes an offer for a commission and begin the process of negotiation, both the artist and the buyer are given negotiation forms. They can edit the details of the negotiation (they can only edit their own form), and once the forms are equal they are allowed to set `accepted` as true. Once they both accept, artists may no longer make an offer for the commission, and the negotiation and the commission details are `finalized` (true) and cannot be changed any more.

`GET` operations return additional fields: `artistAvatar` is the `avatar` property of the artist, and `buyerAvatar` is the `avatar` property of the buyer.

### Chat

Each commission has chat rooms, one per `artistId`. When the negotiation is ongoing, you can simply query GET/ws `/commissions/:commissionId/chats?artistId=X`, and when the commission is ongoing (i.e. the buyer chose an artist and now all other negotiations are closed), you can drop the `?artistId=X` bit, as it's obvious who the commissioner is talking to (that one chosen artist).

### Stripe

There are two types of stripe accounts. A seller account and a customer account used to make purchases. In order to make a customer account, you must submit credit card information in the form of a stripe token to the backend. It will be impossible to begin a commission on the buyer side without first making a customer account. The seller account is required for artists to accept payments. In order to establish a seller account, an authorization code must be sent to the backend.

These stripe information - `stripeAccountId` and `stripeCustomerId` - will NOT be visible to users by default, since you can charge people with just this information. However, when a user signs up/logs in/adds a card/creates a stripe account, these fields will be included in the object returned since we know that it's the user's own information.

And for a stripe customer, they can list their sources (saved payment informations), and pick out which source they want to use for any payment. If they don't specify the source, the default source (the first one in the list) will be used.

## Routes

- [POST `/tokens`](#posts)
- [DELETE `/tokens`](#dels)

- [POST `/users`](#postu)
- [PATCH `/users/verify`](#patchuvt)
- [GET `/users/:userId`](#getuu)
- [POST `/users/reset`](#postur)
- [PATCH `/users/reset`](#patchurt)
- [PATCH `/users`](#patchu)
- [PATCH `/users/:userId`](#patchuu)
- [DELETE `/users`](#delu)

- [POST `/arts`](#posta)
- [POST `/arts/:artId/favorites`](#postaf)
- [GET `/arts`](#geta)
- [GET `/arts/:artId`](#getaa)
- [GET `/arts/:artId/favorites`](#getuuaf)
- [GET `/users/:userId/arts`](#getuua)
- [GET `/users/:userId/favorites`](#getuuf)
- [PATCH `/arts/:artId`](#patchaa)
- [POST `/arts/:artId/list`](#postaal)
- [DELETE `/arts/:artId/list`](#delaal)
- [PATCH `/arts/:artId/purchase`](#patchaap)
- [DELETE `/arts/:artId/favorites`](#delaf)
- [DELETE `/arts/:artId`](#delaa)

- [POST `/commissions`](#postc)
- [GET `/commissions`](#getc)
- [GET `/commissions/:commissionId`](#getcc)
- [GET `/users/:userId/commissions`](#getuuc)
- [PATCH `/commissions/:commissionId`](#patchcc)
- [PATCH `/commissions/:commissionId/reject`](#patchccr)
- [PATCH `/commissions/:commissionId/cancel`](#patchccc)
- [DELETE `/commissions/:commissionId`](#delcc)

- [GET `/negotiations`](#gn)
- [POST `/commissions/:commissionId/negotiations`](#postccn)
- [GET `/commissions/:commissionId/negotiations`](#getccn)
- [GET `/commissions/:commissionId/negotiations/:artistId`](#getccna)
- [PATCH `/commissions/:commissionId/negotiations/:artistId`](#patchccna)

- [GET `/commissions/:commissionId/chats`](#getccnac)
- [ws `/commissions/:commissionId/chats`](#wsccnac)

- [GET `/commissions/:commissionId/updates/:updateNum`](#getccuu)
- [POST `/commissions/:commissionId/updates`](#postcu)
- [PATCH `/commissions/:commissionId/updates/:updateNum`](#patchcun)
- [PATCH `/commissions/:commissionId/updates/:updateNum/waive`](#patchcunw)

- [POST `/stripe/accounts`](#postsacc)
- [POST `/stripe/customers`](#postscust)
- [GET `/stripe/sources`](#getsc)

### <a name="posts"></a>POST `/tokens`

This endpoint is used to login existing users. Fields `username` and `password` are expected. Returns a JWT user object.

### <a name="dels"></a>DELETE `/tokens`

This endpoint is used to logout users who are already logged in. Pass in the JWT to invalidate it and truly sign out the user!

### <a name="postu"></a>POST `/users`

Additionally, an email is sent out to the user's email asking for verification containing a link to `/users/verify/:token` when their account is created successfully.

### <a name="patchuvt"></a>PATCH `/users/verify`

When a user accesses a page of form `/users/verify?token=YOUR_TOKEN_HERE`, a PATCH request should be sent to this endpoint (containing the exact same `YOUR_TOKEN_HERE` querystring value) to verify the user's email address. No fields are expected.

### <a name="getuu"></a>GET `/users/:userId`

### <a name="postur"></a>POST `/users/reset`

This endpoint is used to request a password reset in case a user forgot it. Field `email` is expected.

On success, sends out an email with the password reset link of form `/users/reset/:token`.

### <a name="patchurt"></a>PATCH `/users/reset/:token`

When a user accesses a page of form `/users/reset?token=YOUR_TOKEN_HERE`, a PATCH request should be sent to this endpoint (containing the exact same `YOUR_TOKEN_HERE` querystring value) to reset the user's password. Field `password` is expected (the new password).

### <a name="patchu"></a>PATCH `/users`

### <a name="patchuu"></a>PATCH `/users/:userId`

This route is used for admins/superusers to change a user's details (minus the avatar). ALL changes are allowed (including `banned`). Only superusers can promote/demote users, except for admins recusing themselves (i.e. changing their own `status` from "admin" to "user").

On change, returns the user's new token and invalidates their previous tokens.

### <a name="delu"></a>DELETE `/users`

### <a name="posta"></a>POST `/arts`

### <a name="postsaf"></a>POST `/arts/:artId/favorites`

Command to favorite an art piece.

### <a name="geta"></a>GET `/arts`

This is the "discover page". Currently, it returns the most recent pictures in anti-chronological order. Art can be queried by the status of the piece by appending a querystring `?status=` to the end of the API call. There are three possible statuses: `sold`, `for sale`, and `not for sale`. If you omit the querystring, it will simply return all art.

### <a name="getaa"></a> GET `/arts/:artId`

Returns the art piece associated with the given `artId`.

### <a name="getuuaf"></a>GET `/arts/:artId/favorites`

Returns all of the users who favorites a specific piece of art.

### <a name="getuua"></a>GET `/users/:userId/arts`

Returns all of the art created by a user. Art can be queried by the status of the piece by appending a querystring `?status=` to the end of the API call. There are three possible statuses: `sold`, `for sale`, and `not for sale`. If you omit the querystring, it will simply return all art.

### <a name="getuuf"></a>GET `/users/:userId/favorites`

Returns all of the arts favorited by a user.

### <a name="patchaa"></a>PATCH `/arts/:artId`

### <a name="postaal"></a>POST `/arts/:artId/list`

This endpoint is used to list a user's art piece for sale (from "not for sale" - the default - to "for sale").

### <a name="delaal"></a>DELETE `/arts/:artId/list`

This endpoint is used to unlist a user's art piece for sale (from "for sale" to "not for sale").

### <a name="patchaap"></a>PATCH `/arts/:artId/purchase`

Patch request that charges the user a user for an art purchase. Changes the status of the art piece from `for sale` to `sold`. Requires that a user has a Stripe Customer Id, ensuring that the user has a valid form of payment. If the user has no customer id, the route returns a 402 error code back to the user. A successful call returns the art object back to the user.

### <a name="delaa"></a>DELETE `/arts/:artId`

### <a name="delaf"></a>DELETE `/arts/:artId/favorites`

Delete a user from a list of users favoriting an art piece.

### <a name="postc"></a>POST `/commissions`

### <a name="getc"></a>GET `/commissions`

This is the commission board. Currently, it returns the most recent commissions in anti-chronological order.

### <a name="getcc"></a>GET `/commissions/:commissionId`

### <a name="getuuc"></a>GET `/users/:userId/commissions`

When accessing someone else's commissions (i.e. `:userId` is not the user's `id` or you're not sending a cookie to begin with), you get the user's public commissions that are open _and_ public (i.e. they haven't specified any artist yet).

When accessing the user's own commissions, you can specify the query parameter `as` to display either the user's commissions as `artist` or as `buyer` (it defaults to `buyer`).

### <a name="patchcc"></a>PATCH `/commissions/:commissionId`

This is the endpoint for _buyers_ to update commission details.

### <a name="patchccr"></a>PATCH `/commissions/:commissionId/reject`

This is the endpoint for _artists_ to reject a commission. No fields are expected.

### <a name="patchccc"></a>PATCH `/commissions/:commissionId/cancel`

This is the endpoint for any involved party to cancel a commission. No fields are expected.

### <a name="delcc"></a>DELETE `/commissions/:commissionId`

### <a name="gn"></a>GET `/negotiations`

Returns all of the negotiations

### <a name="postccn"></a>POST `/commissions/:commissionId/negotiations`

This is the endpoint for _artists_ to make a commission offer and begin the process of negotiation. Returns two commission forms as an array (but since this counts as a "single" negotiation, the result is not paginated).

### <a name="getccn"></a>GET `/commissions/:commissionId/negotiations`

### <a name="getccna"></a>GET `/commissions/:commissionId/negotiations/:artistId`

### <a name="patchccna"></a>PATCH `/commissions/:commissionId/negotiations/:artistId`

The buyer/artist can make edits _to their own forms_ (i.e. send an object, not an array).

### <a name="getccnac"></a>GET `/commissions/:commissionId/chats`

This endpoint is used to load previous chats.

### <a name="wsccnac"></a> ws `/commissions/:commissionId/chats`

This _websocket_ endpoint is used to communicate live with the other party - creating chat messages and receiving _live_ updates should be done through this socket. The websocket should send over the JWT as a querystring.

### <a name="getccuu"></a> GET `/commissions/:commissionId/updates/:updateNum`

This route allows both the artist and the buyer to access the update. If the artist submitted early and the buyer is trying to view the update `pictures` before the deadline, the artist will be paid early (this process may take some time, but it's all contained in one request so the end user just has to wait a while), and _then_ the buyer will be allowed to view the update.

If the artist did not submit the in-progress update `pictures`, the buyer can view it anytime (we're only ensuring that the artist gets paid when the buyer views the `pictures`).

### <a name="postcu"></a> POST `/commissions/:commissionId/updates`

This post method should be used to send the payment for a commission. By doing so, it begins the commission process on the backend. For a buyer to use this method, they must first be a valid stripe customer, which requires calling `/stripe/customers`. The user must be logged, and the user must send over a cookie in order to use this route. This route cannot not be called by the artist, otherwise it will return a 403 error.

If the user doesn't specify the `source`, the payment will be taken out of their _default_ source (which is the first one on the list).

### <a name="patchcun"></a> PATCH `/commissions/:commissionId/updates/:updateNum`

Patch method to be called by the artist when submitting an update to the buyer. If the user is not the artist, this will return a 403 error. This method requires that an array of pictures be sent in the form of a formdata. This array is limited to four pictures. If this method is called successfully it will send an update object to the user. It will also initiate a transfer of money on the backend from us to the artist. In order to call this method, the artist must be logged in and a cookie must be sent to the backend.

### <a name="patchcunw"></a> PATCH `/commissions/:commissionId/updates/:updateNum/waive`

Patch method to be called by the buyer when they want to waive an update. If the user is not the buyer, then it will return a 403 error. If called successfully, this will send a money transfer from us to the artist. The current update will also increment. In order to call this method, the artist must be logged in and a cookie must be sent to the backend.

### <a name="#postsacc"></a> POST `/stripe/accounts`

This post method should be used to create a seller account for an artist. It takes in data containing the authorization `code` obtained from stripe on the frontend. This route requires that the user be logged in, and that the user sends over a cookie in order to be used.

Returns the new user information when successful.

### <a name="#postscust"></a> POST `/stripe/customers`

This post method should be used to create a customer account on the backend. It requires that the frontend send over a `stripeToken` for a payment source related to that user (e.g. credit card). The user must be logged, and the user must send over a cookie in order to use this route.

Returns the new user information when successful.

### <a name="#getsc"></a> GET `/stripe/sources`

This returns all of the "sources" for the customer. For each source, we attach the properties `id`, `created`, `bank_name`, `country`, `last4`, and `brand`. For information on these properties, please see the stripe docs: [https://stripe.com/docs/api/customers/object#customer_object-sources-data-id](https://www.youtube.com/watch?v=6n3pFFPSlW4). No pagination yet...
