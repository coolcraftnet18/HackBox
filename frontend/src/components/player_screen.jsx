import React from 'react';
import { withRouter } from 'react-router-dom';
import {graphql, compose} from 'react-apollo';

import { FindRoomQuery, RetrievePromptsQuery } from '../gql/gql_query';
import { findRoomOptions } from '../gql_actions/query_actions';
import { subscribeToRoomStatus } from '../gql_actions/subscription_actions';

import { 
  UpdateStatusMutation,
  AddAnswerToResponseMutation,
  AddVoteToAnswerMutation,
} from '../gql/gql_mutation';

class PlayerScreen extends React.Component {

  state = {
    answer: ''
  }

  componentDidMount() {
    subscribeToRoomStatus(this.props.findRoomQuery, this.room.code);
  }

  updateStatus = (options) => {
    let code = this.room.code;
    this.props.updateStatus({
      variables: {
        code,
        options
      }
    });
  }
  
  addAnswer = (responseId) => {
    let code = this.room.code;
    let username = localStorage.username;
    let answers = [this.state.answer];
    this.props.addAnswer({
      variables: {
        responseId, code, username, answers
      }
    });
  }
  
  addVote = (answerId, responseId) => {
    let code = this.room.code;
    let username = localStorage.username;
    this.props.addVote({
      variables: {
        code, username, answerId, responseId
      }
    });
  }

  submit = () => {
    this.addAnswer(this.resIds.shift());
    this.setState({ answer: ''});
  }

  updateAnswer = e => {
    this.setState({ answer: e.currentTarget.value });
  }

  answer = () => { 
    return (
      <div>
        <form onSubmit={() => this.submit()}>
          <input 
            onChange={this.updateAnswer}
            value={this.state.answer}
            placeholder='Answer here'/>
        </form>
      </div>
    );
  }

  vote = () => {
    return (
      <div>
        <h3>Vote your favorite answer!</h3>
        <button onClick={this.voted}>Answer A</button>
        <button onClick={this.voted}>Answer B</button>
      </div>
    );
  }

  voted = e => {
    e.preventDefault();
    // this.addVote(answerId, responseId);
  }

  render() {
    let {data: {loading, retrievePlayerPrompts}} = this.props;
    this.room = this.props.findRoomQuery.findRoom;
    if (!this.room || loading) {
      return null;
    }

    let { 
      currentRound, 
      timer, 
    } = this.room.status;

    let cards = retrievePlayerPrompts;
    if (!cards) {
      return null;
    }
    this.resIds = cards.map(card => this.room.prompts.find(res => res.prompt.prompt === card.prompt).id)
    // debugger
    cards = cards.map(card => {
      return <li key={card.id}>{card.prompt}</li>
    });
    cards = <ul className='prompt-list'>{cards}</ul>;

    return (
      <div>
        <h3>Current Round: {currentRound} / {this.room.numRounds} </h3>
        <h3>Timer: {timer}s</h3>
        {cards}
        {this.answer()}
        {this.vote()}
      </div>
    );
  }
}

export default compose (
  graphql(FindRoomQuery, findRoomOptions()),
  graphql(RetrievePromptsQuery, {
    options: {
      variables: {
        code: localStorage.roomId,
        username: localStorage.username
      }
    }
  }),
  graphql(UpdateStatusMutation, {name: 'updateStatus'}),
  graphql(AddAnswerToResponseMutation, {name: 'addAnswer'}),
  graphql(AddVoteToAnswerMutation, {name: 'addVote'}),
)(withRouter(PlayerScreen));