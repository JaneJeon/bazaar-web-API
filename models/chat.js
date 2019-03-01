const BaseModel = require("./base")

class Chat extends BaseModel {
  static get idColumn() {
    return ["commission_id", "artist_id", "dummy_field"]
  }

  static get jsonSchema() {
    return {
      type: "object",
      properties: {
        userId: { type: "string" },
        body: { type: "string", maxLength: process.env.MAX_CHAT_LENGTH }
      },
      required: ["userId", "body"],
      additionalProperties: false
    }
  }

  static get hidden() {
    return ["dummyField"]
  }

  static get autoFields() {
    return ["userId"]
  }
}

module.exports = Chat
