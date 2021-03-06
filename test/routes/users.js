require("../lib/text")

const request = require("supertest")(require("../../app"))
const assert = require("assert")
const tempToken = require("../../lib/temp-token")
const { User } = require("../../models")
const jwt = require("jsonwebtoken")
const { users } = require("./tokens")

describe("user routes", () => {
  let token
  const testUser = {
    username: "Ricky_Cranium",
    password: "123456789",
    email: "success@simulator.amazonses.com"
  }

  before(async () => {
    const res = await request.post("/tokens").send(users[0])
    token = res.body
  })

  describe("POST /users", () => {
    it("should sign up", done => {
      request
        .post("/users")
        .send(testUser)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)

          const user = jwt.decode(res.body)
          assert(user.verified === false)
          assert(user.avatar !== null)
          done()
        })
    })

    it("should 400 when parameters are wrong", async () => {
      await request
        .post("/users")
        .send({ username: "hello", password: "123", email: "asdf@gmail.com" })
        .expect(400)
    })
  })

  describe("GET /users/:userId", () => {
    it("should return the user information", async () => {
      const res = await request
        .get(`/users/${testUser.username.toLowerCase()}`)
        .expect(200)

      assert(res.body.username == testUser.username)
      assert(res.body.password != testUser.password)
    })

    it("should 404 when user is not found", async () => {
      await request.get("/users/999").expect(404)
    })
  })

  describe("PATCH /users/verify", () => {
    let tmpToken

    before(async () => {
      tmpToken = await tempToken.findOne("verify")
    })

    it("should verify user given the right token", async () => {
      await request.patch(`/users/verify?tempToken=${tmpToken}`).expect(200)
    })

    it("should reject token doesn't match any user", async () => {
      await request.patch(`/users/verify?tempToken=${tmpToken}1`).expect(404)
    })

    it("should not allow a token to be used twice", async () => {
      const result = await tempToken.fetch("verify", tmpToken)

      assert(result === null)
    })
  })

  describe("POST /users/reset", () => {
    it("should send password reset email", async () => {
      await request
        .post("/users/reset")
        .send({ email: testUser.email })
        .expect(200)

      assert(await tempToken.findOne("reset"))
    })
  })

  describe("PATCH /users/reset", () => {
    let tmpToken

    before(async () => {
      tmpToken = await tempToken.findOne("reset")
    })

    it("should reset password given the right token", async () => {
      await request
        .patch(`/users/reset?tempToken=${tmpToken}`)
        .send({ password: "987654321" })
        .expect(200)
    })

    it("should reject token doesn't match any user", async () => {
      await request.patch(`/users/reset?tempToken=${tmpToken}1`).expect(404)
    })

    it("should not allow a token to be used twice", async () => {
      const result = await tempToken.fetch("reset", tmpToken)

      assert(result === null)
    })
  })

  describe("PATCH /users", () => {
    it("should update user details when logged in", async () => {
      const res = await request
        .patch("/users")
        .set("Authorization", "Bearer " + token)
        .send({ bio: "Just some dude" })
        .expect(200)

      token = res.body
    })

    it("should not allow users to update username", async () => {
      await request
        .patch("/users")
        .set("Authorization", "Bearer " + token)
        .send({ username: "xXh4X0rzXx" })
        .expect(400)
    })
  })

  describe("DELETE /users", () => {
    it.skip("should delete the user", async () => {
      await request
        .delete("/users")
        .set("Authorization", "Bearer " + token)
        .expect(204)

      const user = await User.query().findById(testUser.username.toLowerCase())
      assert(user.deleted === true)
    })
  })
})
