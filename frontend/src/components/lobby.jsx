import React from 'react';
import {storage} from '../util/util'
import { withRouter } from 'react-router-dom';
//need to bind with component
import {graphql, compose} from 'react-apollo';

import { FindRoomQuery } from '../gql/gql_query';
import { findRoomOptions } from '../gql_actions/query_actions';

import { UpdateStatusMutation } from '../gql/gql_mutation';

import {
  subscribeToNewPlayers,
  subscribeToRoomStatus
} from '../gql_actions/subscription_actions';

import {
  showPlayers
} from '../util/util';

import Game from './game';

import {Modal} from './modal';

class Lobby extends React.Component {
  constructor(props){
    super(props)
    // this.room = this.props.findRoomQuery.findRoom;
    // if (!this.room) {
    //   this.props.history.push("/")
    // }
  }
  state = {
    show: false
  }
  componentDidMount() {
    let {code} = this.props.match.params;
    subscribeToNewPlayers(this.props.findRoomQuery, code)
    subscribeToRoomStatus(this.props.findRoomQuery, code)
    this.hideModal();
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

  toggleStartButton = () => {
    if (storage().roomId !== this.room.code) {
      return null;
    }

    if (storage().isHost === 'true' && this.room.players.length > 1) {
      return (
        <button onClick={this.startGame}>Start Game</button>
      )
    }
  }


  waitingStage = () => {
    return (
      <div>
        {showPlayers(this.room.players)}
        {this.toggleStartButton()}
      </div>
    );
  }

  gameStage = () => {
    return (
      <div>
        <Game />
      </div>
    );
  }

  leaveRoom = () => {
    storage().clear();
    this.props.history.push('/');
  }

  startGame = () => {
    this.updateStatus({
      gameStarted: true,
      answerPhase: true
    });
  }
  
  updateStage = () => {
    if (this.room.status.gameOver) {
      return <h2>The game in this room has ended.</h2>;
    }

    return this.room.status.gameStarted ? this.gameStage() : this.waitingStage()
  }

  showModal = () => {
    this.setState({ show: true })
  }
  hideModal = () => {
    this.setState({ show: false })
  }

  render() {

    this.room = this.props.findRoomQuery.findRoom;

    if (!this.room) {
      return null;
    }

    if (this.state.show) {
      return (
        <div className='single-room'>
          <h2>{this.room.gameType}</h2>
          <button onClick={this.leaveRoom}>Leave Room</button>
          {this.updateStage()}

          <Modal show={this.state.show} handleClose={this.hideModal} />
        </div>
      );
      } 

    return (
      <div className='single-room'>
        <h2>{this.room.gameType}</h2>
        <button onClick={this.leaveRoom}>Leave Room</button>
        <br/>
        <button onClick={this.showModal}>Instructions</button>
        {this.updateStage()}

      </div>
    );
  }
}

export default compose (
  graphql(FindRoomQuery, findRoomOptions()),
  graphql(UpdateStatusMutation, {name: 'updateStatus'}),
)(withRouter(Lobby));
