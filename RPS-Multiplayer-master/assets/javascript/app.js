// Initialize Firebase
var config = {
    apiKey: "AIzaSyAdGhATJcg2BS46FhM1GNsJaBrjfQ9Ew3Q",
    authDomain: "rps-multiplayer-25dc4.firebaseapp.com",
    databaseURL: "https://rps-multiplayer-25dc4.firebaseio.com",
    storageBucket: "rps-multiplayer-25dc4.appspot.com",
    messagingSenderId: "449061417502"
};
firebase.initializeApp(config);

// reference the database
var database = firebase.database();

// ------------- begin Mark's presence code --------------------------------- //

// connectionsRef references a specific location in our database.
// All of our connections will be stored in this directory.
var connectionsRef = database.ref('/connections');

// '.info/connected' is a special location provided by Firebase that is updated every time
// the client's connection state changes.
// '.info/connected' is a boolean value, true if the client is connected and false if they are not.
var connectedRef = database.ref('.info/connected');

// When the client's connection state changes...
connectedRef.on("value", function(snapshot) {

    // If they are connected..
    if (snapshot.val()) {

        // Add user to the connections list.
        var con = connectionsRef.push(true);

        // ADDED - set users key in localStorage for reference
        localStorage.setItem('userKey', con.key);

        // Remove user from the connection list when they disconnect.
        con.onDisconnect().remove();
    }
});

// ADDED - initialize global variable for the list of watchers
var watchersList;

// When first loaded or when the connections list changes...
connectionsRef.on("value", function(snapshot) {
    // REMOVED - setting watchers count in the HTML

    // ADDED - set list of watchers
    watchersList = Object.keys(snapshot.val());
});

// ---------------- end Mark's presence code -------------------------------- //

// set game object -- to be populated laters
var game = {
    currentPlayer: '',
    playerOne: '',
    playerTwo: '',
    currentPlayerWins: 0,
    otherPlayerWins: 0,
    playerOneChoice: '',
    playerTwoChoice: ''
};

$(document).on('ready', function() {
    // listen for message removal
    $('#remove-message').on('click', function() {
        $('#welcome').hide();
    });

    // if player already exists on this device set the username to currentPlayer
    game.currentPlayer = localStorage.getItem('username');

    // if player does not already exist on this device
    if (game.currentPlayer === null) {
        // show the entrance screen and hide the gameplay screen to force username input
        $('#entrance').show();
        $('#gameplay').hide();
        // when a username has been input and the submit button is selected
        $('#submit').on('click', function() {
            var input = $('#username').val().trim();
            if (input !== '') {
                // set the currentPlayer variable
                game.currentPlayer = input;
                // set the localStorage item -- so when the player returns this does not happen again
                localStorage.setItem('username', game.currentPlayer);
            }
        });
        return;
    }

    // set the welcome message
    $('#welcome-message').text('Welcome ' + game.currentPlayer + '!');
    // set the username in the game board
    $('#current-player').text(game.currentPlayer);
    // show the welcome message
    $('#welcome').show();
    // hide the entrance screen
    $('#entrance').hide();
    // show the gameplay screen
    $('#gameplay').show();
    // show waiting on player alert
    $('#waiting-on-player').show();
    // hide player 2 card
    $('#other-player-panel').hide();

    // get most recent game object in firebase
    database.ref('game').on('value', function(snapshot) {
        game.playerOne = snapshot.val().player1;
        game.playerTwo = snapshot.val().player2;
        game.playerOneChoice = snapshot.val().player1choice;
        game.playerTwoChoice = snapshot.val().player2choice;

        // if current player is player one
        if (game.currentPlayer === game.playerOne) {
            // set wins for current player
            game.currentPlayerWins = snapshot.val().playerOneWins;
            // set wins for other player
            game.otherPlayerWins = snapshot.val().playerTwoWins;
            // if current player is player two
        } else if (game.currentPlayer === game.playerTwo) {
            // set wins for current player
            game.currentPlayerWins = snapshot.val().playerTwoWins;
            // set wins for other player
            game.otherPlayerWins = snapshot.val().playerOneWins;
        }

        // check for current "open" game
        // if there is an open game
        if (watchersList.length % 2 === 0 && game.playerTwo === undefined) {
            // check that current player is not already attached to this game
            if (game.playerOne !== game.currentPlayer) {
                // the current player is player 2
                database.ref('game').update({
                    player2: game.currentPlayer,
                    player2key: localStorage.getItem('userKey'),
                    playerTwoWins: 0,
                    player2choice: ''
                });
            }
            // check that current player is not already attached to latest game
        } else if (game.playerOne === undefined) {
            // create new game
            // the current player is player 1
            database.ref('game').update({
                player1: game.currentPlayer,
                player1key: localStorage.getItem('userKey'),
                playerOneWins: 0,
                player1choice: ''
            });
        } else if (watchersList.length >= 2 && (game.playerOne === game.currentPlayer || game.playerTwo === game.currentPlayer)) {
            if (game.playerOne === game.currentPlayer) {
                // set player2 as the other player
                $('#other-player').text(game.playerTwo);
            } else if (game.playerTwo === game.currentPlayer) {
                // set player1 as the other player
                $('#other-player').text(game.playerOne);
            }
            // hide waiting alert
            $('#waiting-on-player').hide();
            // show other player card
            $('#other-player-panel').show();
            // display current players wins or 0 if undefined
            $('#current-wins').text(game.currentPlayerWins || 0);
            // display current players losses or 0 if undefined (which are the other players wins)
            $('#current-losses').text(game.otherPlayerWins || 0);
            // display other players wins
            $('#other-wins').text(game.otherPlayerWins);
            // display other players losses (which are the current players wins)
            $('#other-losses').text(game.currentPlayerWins);

            // listen for request for new game
            $('#new-game').on('click', function() {
                // reset game object
                database.ref('game').update({
                    player1: game.currentPlayer,
                    player1key: localStorage.getItem('userKey'),
                    playerOneWins: 0,
                    player1choice: '',
                    playerTwoWins: 0
                });
                database.ref('game/player2').remove();
                database.ref('game/playerTwoChoice').remove();
                // remove messaging object
                database.ref('messaging').remove();
                location.reload();
            });

            // if both players have made a choice on current round
            if (game.playerOneChoice !== '' && game.playerTwoChoice !== '') {
                // show players choices
                if (game.playerOne === game.currentPlayer) {
                    $('#other-choice').text('They played ' + game.playerTwoChoice);
                } else if (game.playerTwo === game.currentPlayer) {
                    $('#other-choice').text('They played ' + game.playerOneChoice);
                }

                // if both players choices are the same
                if (game.playerOneChoice === game.playerTwoChoice) {
                    $('#current-result').text('You tied');
                    $('#other-result').text('They tied');

                    setTimeout(function() {
                        database.ref('game').update({
                            player1choice: '',
                            player2choice: ''
                        });
                        reset();
                    }, 3000);
                    // if player one wins
                } else if ((game.playerOneChoice === 'Rock' && game.playerTwoChoice === 'Scissors') ||
                    (game.playerOneChoice === 'Scissors' && game.playerTwoChoice === 'Paper') ||
                    (game.playerOneChoice === 'Paper' && game.playerTwoChoice === 'Rock')) {

                    // if current player is player one (the winner)
                    if (game.currentPlayer === game.playerOne) {
                        youWin();
                        // if current player is player two (the loser)
                    } else {
                        theyWin();
                    }

                    setTimeout(function() {
                        var wins = snapshot.val().playerOneWins;
                        database.ref('game').update({
                            playerOneWins: wins + 1,
                            player1choice: '',
                            player2choice: ''
                        });

                        reset();
                    }, 3000);
                    // if player two wins
                } else {
                    // if current player is player two (the winner)
                    if (game.currentPlayer === game.playerTwo) {
                        youWin();
                        // if current player is player one (the loser)
                    } else {
                        theyWin();
                    }

                    setTimeout(function() {
                        var wins = snapshot.val().playerOneWins;
                        database.ref('game').update({
                            playerTwoWins: wins + 1,
                            player1choice: '',
                            player2choice: ''
                        });

                        reset();
                    }, 3000);
                }
            }

            // listen for a user to make a choice
            $('.choice').on('click', function() {
                // set the choice to choice
                var choice = $(this).text();
                // display what was chosen
                $('#current-choice').text('You chose ' + choice);
                // if the current player is player one and they have not yet chosen
                if (game.playerOne === game.currentPlayer && game.playerOneChoice === '') {
                    // set the choice for player one in this round
                    database.ref('game').update({
                        player1choice: choice
                    });
                    $('.choice').hide();
                    // if the current player is player two and they have not yet chosen
                } else if (game.playerTwo === game.currentPlayer && game.playerTwoChoice === '') {
                    // set the choice for player two in this round
                    database.ref('game').update({
                        player2choice: choice
                    });
                    $('.choice').hide();
                }
                // don't refresh page
                return false;
            });
        }

    });

    // on click of the messaging submit button
    $('#send-message').on('click', function() {
        // get the message input
        var message = $('#message').val().trim();
        // if the message input is not empty
        if (message !== '') {
            // push the message to firebase
            database.ref('messaging').push({
                message: message,
                user: game.currentPlayer,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            // clear input
            $('#message').val('');
        }
        // do not refresh page
        return false;
    });

    // hack to keep messages from showing duplicates
    $('#messages').empty();

    // listen for value in messaging portion of the game object on firebase -- limit to the last one
    database.ref('messaging').on('child_added', function(childSnapshot, prevChildSnapshot) {
        // get the user who wrote the message
        var user = childSnapshot.val().user;
        // get the message
        var message = childSnapshot.val().message;
        // get the timestamp of the message
        var timestamp = moment(childSnapshot.val().timestamp).format('M/D/YY h:mm:s a');
        // show message to the user
        $('#messages').prepend('<p>' + timestamp + ' - ' + user + ': ' + message + '</p>');
    });
});

// display who won to the user, if the user won
function youWin() {
    $('#current-result').text('You win!');
    $('#other-result').text('They lose!');
}

// display who won to the user, if the user lost
function theyWin() {
    $('#current-result').text('You lose!');
    $('#other-result').text('They win!');
}

// reset
function reset() {
    // set directions
    $('#current-choice').text('Please make a choice');
    // display waiting message
    $('#other-choice').text('Waiting on other player to choose');
    // clear results
    $('#current-result').text('');
    $('#other-result').text('');
    $('.choice').show();
}