import React, { Component } from 'react';

//need to bind with component
import {graphql, compose} from 'react-apollo';

import TextField from '@material-ui/core/TextField';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

import { 
  RoomsQuery,
  CreateRoomMutation, 
  AddPlayerMutation,
  RemoveRoomMutation
} from './gql_query';

class Welcome extends Component {

  state = {
    username: "",
    code: ""
  }

  handleChange(field) {
    return (e) => this.setState({[field]: e.currentTarget.value.toUpperCase()});
  };

  getRandomCode() {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let code = '';
    for (let i = 0; i < 4; i++) {
      code += alpha[Math.floor(Math.random() * alpha.length)];
    }
    return code;
  }

  createRoom = async () => {
    let code = this.getRandomCode();
    
    if (!code) {
      return null;
    }

    await this.props.createRoom({
      variables: {
        code
      },
      update: (store, { data: { createRoom } }) => {
        // Read the data from our cache for this query.
        const data = store.readQuery({ query: RoomsQuery });
        // Add our comment from the mutation to the end.
        data.rooms.unshift(createRoom)
        // Write our data back to the cache.
        store.writeQuery({ query: RoomsQuery, data });
      }
    });

    this.setState({code: ""});
  }


  addPlayer = async () => {
    await this.props.addPlayer({
      variables: {
        code: this.state.code,
        username: this.state.username
      }
    })
  }

  removeRoom = async (room) => {
    await this.props.removeRoom({
      variables: {
        id: room.id
      },
      update: (store) => {
        // Read the data from our cache for this query.
        const data = store.readQuery({ query: RoomsQuery });
        // Add our comment from the mutation to the end.
        data.rooms = data.rooms.filter(x => x.id !== room.id)
        // Write our data back to the cache.
        store.writeQuery({ query: RoomsQuery, data });
      }
    })
  }

  render() {
    const {data: {loading, rooms}} = this.props;
    const {username, code} = this.state;
    
    if (loading) {
      return null;
    }

    return(

      <div style={{margin: '0 300px'}}>

      <button onClick={this.createRoom}>Create Room</button>
      <br/>
      <TextField
        onChange={this.handleChange("code")}
        value={code}
        label="Room Code"
        inputProps={{ maxLength: 4 }}
        />
      <TextField
        onChange={this.handleChange("username")}
        value={username}
        label="Username"
        inputProps={{ maxLength: 12 }}
      />

      <button onClick={this.addPlayer}>Join Room</button>


      <List>
        {rooms.map(room => (
          <ListItem
          key={room.id}
          role={undefined}
          dense
          button
          >
          <ListItemText primary={`${room.code}: players: ${room.players.length}`} />

              <button onClick={() => this.removeRoom(room)}>
                remove
              </button>

          </ListItem>
        ))}
      </List>


      </div>
    );
  }
}

export default compose (
  graphql(RoomsQuery),
  graphql(CreateRoomMutation, {name: "createRoom"}),
  graphql(RemoveRoomMutation, {name: "removeRoom"}),
  graphql(AddPlayerMutation, {name: "addPlayer"}),
)(Welcome);