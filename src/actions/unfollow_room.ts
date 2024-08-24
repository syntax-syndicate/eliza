import { composeContext } from "../core/context.ts";
import { AgentRuntime } from "../core/runtime.ts";
import { Action, Message, State } from "../core/types.ts";

const shouldUnfollowTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} stop closely following this previously followed room and only respond when mentioned?
Respond with YES if:
- The user has suggested that {{agentName}} is over-participating or being disruptive  
- {{agentName}}'s eagerness to contribute is not well-received by the users
- The conversation has shifted to a topic where {{agentName}} has less to add

Otherwise, respond with NO.  
Only respond with YES or NO.`;
export default {
  name: "UNFOLLOW_ROOM",
  description:
    "Stop following this channel. You can still respond if explicitly mentioned, but you won't automatically chime in anymore. Unfollow if you're annoying people or have been asked to.",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const roomId = message.room_id;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId,
    );
    return userState === "FOLLOWED";
  },
  handler: async (runtime: AgentRuntime, message: Message) => {
    async function _shouldUnfollow(state: State): Promise<boolean> {
      const shouldUnfollowContext = composeContext({
        state,
        template: shouldUnfollowTemplate, // Define this template separately
      });

      let response = "";

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          response = await runtime.completion({
            context: shouldUnfollowContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldUnfollow:", error);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      const lowerResponse = response.toLowerCase().trim();
      return lowerResponse.includes("yes");
    }

    const state = await runtime.composeState(message);

    if (await _shouldUnfollow(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.room_id,
        runtime.agentId,
        null,
      );
    }
  },

  condition:
    "The user no longer wants to auto-respond to all messages in a channel.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Hey {{user2}} stop participating in this channel for now",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Alright, I will stop chiming in",
          action: "UNFOLLOW_ROOM",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Has anyone tried the new update",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Yes, it's pretty slick",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "{{user3}}, please stop following this chat",
        },
      },
      {
        user: "{{user3}}",
        content: {
          content:
            "Understood",
          action: "UNFOLLOW_ROOM",
        },
      },
    ],
    [
      [
        {
          user: "{{user1}}",
          content: {
            content: "hey {{user3}} stop participating here so frequently",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "I'll only respond when mentioned",
            action: "UNFOLLOW_ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "thoughts on the budget",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content: "{{user3}} should we increase it",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "A small increase could work given our past results...",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user3}}, unfollow this room for now",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "I'll only engage when asked",
            action: "UNFOLLOW_ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content:
              "wait {{user3}} come back and give me your thoughts",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "Okay... I think it's intuitive, parallel tests are nice",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "yo {{user2}} chill on all the messages damn",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "my bad, I'll step back",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}} STOP MESSAGING IN THIS ROOM",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "No problem, I've got other stuff to work on",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}} ur bein annoyin pls stop",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "sry, ill chill",
            action: "UNFOLLOW_ROOM",
          },
        }
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}}, please cease engaging in this room",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "No sweat",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user2}}",
          content: {
            content: "Excited for the weekend, any plans folks",
          },
        },
        {
          user: "{{user1}}",
          content: {
            content:
              "{{user3}} you're getting a bit too chatty, tone it down",
          },
        },
        {
          user: "{{user3}}",
          content: {
            content: "Noted",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "hey {{user2}} can u like... not",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "Sorry, I'll go work on other things",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}}, your eagerness is disruptive, please desist",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "My apologies, I shall withdraw post-haste",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "{{user2}} stahp followin dis room plz",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "kk sry ill stahppp",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            content: "stfu you stupid bot",
          },
        },
        {
          user: "{{user2}}",
          content: {
            content: "sry",
            action: "UNFOLLOW_ROOM",
          },
        },
      ],
    ],
  ],
} as Action;