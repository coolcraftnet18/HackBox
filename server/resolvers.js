import { Room, Player, Card, Status, Answer, Response } from './models';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { flattenSelections } from 'apollo-utilities';

const pubsub = new PubSub();
const JOINED_ROOM = 'JOINED_ROOM';
const CREATED_ROOM = 'CREATED_ROOM';
const REMOVED_ROOM = 'REMOVED_ROOM';
const UPDATE_STATUS = 'UPDATE_STATUS';

require("babel-polyfill");

const resolvers = { 
  Query: {
    rooms: () => Room.find(),
    findRoom: (_, { code }) => Room.findOne({ code }),
    findCards: (_, { cardType, numCards }) => Card.aggregate().match({ cardType }).sample(numCards),
  },
  Mutation: {
    createRoom: async (_, { code, numRounds, gameType }) => {
      const status = new Status();
      const room = new Room({ code, numRounds, gameType, status });
      await room.save();
      pubsub.publish(CREATED_ROOM, { createdRoom: room })
      return room;
    },
    removeRoom: async (_, { id }) => {
      await Room.findByIdAndRemove(id);
      pubsub.publish(REMOVED_ROOM, { removedRoom: id })
      return true;
    },
    addPlayer: async (_, { code, username }) => {
      let usernameTaken = await Room.findOne({code, "players.username": username}).exec();
      if (usernameTaken) {
        usernameTaken = "Username taken"
      } else {
        const player = new Player({ username, score: 0 });
        await Room.update(
          { code }, 
          {$push: { players: player }}
        );
      }
      const room = Room.findOne({ code });
      pubsub.publish(`${JOINED_ROOM}.${code}`, { joinedRoom: room, usernameTaken })
      return room;
    },
    addPlayerHand: async (_, {code, username, numCards, cardType}) => {
      const cards = await Card.aggregate().match({ cardType }).sample(numCards).exec()
      return await Room.findOneAndUpdate(
        {code, "players.username": username},
        {$push: {"players.$.hand": cards}})
    },
    updateStatus: async (_, { code, options }) => {
      return await Room.findOneAndUpdate({code},
        { $set: { status: options } },
        (err, {status}) => {
          status = status._doc
          pubsub.publish(`${UPDATE_STATUS}.${code}`, { updateStatus: status})
        }
      )
    },
    retrieveAndAssignPrompts: async (_, { code, cardType }) => {
      const room = await Room.findOne({code});
      const { players, discard, numRounds, status } = room._doc;

      const numCards = numRounds !== status.currentRound ? room.players.length : 1
      let playerShuffles = players.concat(players); shuffleArray(playerShuffles);
      const ids = discard.map( card => card.id);

      const prompts = await Card.aggregate().match({ cardType, id: {$nin: ids } }).sample(numCards).exec()
      let promptObjects = getPromptsObject(playerShuffles, numCards, prompts);

      await Room.findOneAndUpdate({code}, {$push: { discard: prompts, prompts: promptObjects}})

      return prompts;
    },
    addPlayerScore: async(_, {code, username, points}) => {
      return await Room.findOneAndUpdate({ code, "players.username": username},
       { $inc: { "players.$.score": points }});
    }
  },
  Subscription: {
    joinedRoom: {
      subscribe: (_, { code }) => pubsub.asyncIterator(`${JOINED_ROOM}.${code}`)
    },
    createdRoom: {
      subscribe: () => pubsub.asyncIterator(CREATED_ROOM)
    },
    removedRoom: {
      subscribe: () => pubsub.asyncIterator(REMOVED_ROOM)
    },
    updateStatus: {
      subscribe: (_, { code }) => pubsub.asyncIterator(`${UPDATE_STATUS}.${code}`)
    }
  }
}

export default resolvers;

const getPromptsObject = (playerShuffles, numCards, prompts) => {
  let promptObjects;
  if (numCards === 1) {
    promptObjects = [new Response({ prompt: prompts[0], players })]
  } else {
    promptObjects = prompts.map( prompt => {
      const players = []
      players.push(playerShuffles.pop());
      const arr = playerShuffles.filter( pl => !players.includes(pl))
      players.push(arr.pop())
      if (playerShuffles.includes(players[0])) {
        arr.push(players[0])
      }
      playerShuffles = arr;
      return new Response({ prompt, players })
    })
  }
  return promptObjects;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}