import React from 'react';
import { withRouter } from 'react-router-dom';
import {graphql, compose} from 'react-apollo';

import { FindRoomQuery, RetrievePromptsQuery } from '../gql/gql_query';
import { findRoomOptions } from '../gql_actions/query_actions';
import { subscribeToRoomStatus } from '../gql_actions/subscription_actions';

import { 
  UpdateStatusMutation,
  AddAnswerToResponseMutation,
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
    let username = localStorage.playerId;
    let answers = this.state.answer;
    this.props.addAnswer({
      variables: {
        responseId, code, username, answers
      }
    });
  }

  submit = e => {
    e.preventDefault();
    // this.addAnswer(responseId);
    this.setState({ answer: ''});
  }

  answered = e => {
    this.setState({ answer: e.currentTarget.value });
  }

  answer = () => { 
    return (
      <div>
        <form onSubmit={this.submit}>
          <input 
            onChange={this.answered}
            value={this.state.answer}
            placeholder='Answer here'/>
        </form>
      </div>
    );
  }

  vote = () => {
    return (
      <div>
        <h3>Vote your favorite response!</h3>
        <button onClick={this.voted}>Response A</button>
        <button onClick={this.voted}>Response B</button>
      </div>
    );
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

    let prompts = retrievePlayerPrompts;
    prompts = prompts.map(card => {
      return <li key={card.id}>{card.prompt}</li>
    });

    // let num = this.room.players.length;
    // let prompts = this.room.prompts.slice((currentRound-1)*num, num * currentRound);
    // prompts = prompts.map(res => {
    //   return <li key={res.id}>{res.prompt.prompt}</li>;
    // });
    prompts = <ul className='prompt-list'>{prompts}</ul>;

    return (
      <div>
        <h3>Current Round: {currentRound} / {this.room.numRounds} </h3>
        <h3>Timer: {timer}s</h3>
        {prompts}
        {this.answer()}
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
        username: localStorage.playerId
      }
    }
  }),
  graphql(UpdateStatusMutation, {name: 'updateStatus'}),
  graphql(AddAnswerToResponseMutation, {name: 'addAnswer'}),
)(withRouter(PlayerScreen));