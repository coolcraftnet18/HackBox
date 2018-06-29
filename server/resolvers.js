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
    // buildDeck: async (_, {code, cardType, numCards}) => {
    //   const discard = await Card.aggregate().match({ cardType }).sample(numCards).exec()
    //   return await Room.findOneAndUpdate({ code }, { $set: { discard }})
    // },
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
    retrieveCards: async (_, {code, numCards, cardType}) => {
      // 
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
      const playerShuffles = players.concat(players); shuffleArray(playerShuffles);
      const ids = discard.map( card => card.id);

      const prompts = await Card.aggregate().match({ cardType, id: {$nin: ids } }).sample(numCards).exec()
      const promptObjects = prompts.map( prompt => new Response({prompt, players: playerShuffles.splice(0,2)}))
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
  }
}