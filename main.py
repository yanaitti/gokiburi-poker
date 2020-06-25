from flask import Flask, Response, render_template, url_for
from flask_caching import Cache
import uuid
import random
import collections
import json
import os
import copy
import numpy as np

app = Flask(__name__)


@app.context_processor
def override_url_for():
    return dict(url_for=dated_url_for)


def dated_url_for(endpoint, **values):
    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path,
                                     endpoint, filename)
            values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)


@app.after_request
def add_header(r):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

# Cacheインスタンスの作成
cache = Cache(app, config={
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': os.environ.get('REDIS_URL', 'redis://localhost:6379'),
    'CACHE_DEFAULT_TIMEOUT': 60 * 60 * 2,
})

'''
typeid:
 0.ごきぶり
 1.くも
 2.かめむし
 3.ねずみ
 4.さそり
 5.はえ
 6.こうもり
 7.かえる

cardnum:
 cardnum % 8

'''

@app.route('/')
def homepage():
    return render_template('index.html')


# create the game group
@app.route('/create')
@app.route('/create/<nickname>')
def create_game(nickname=''):
    game = {
        'status': 'waiting',
        'players': []}
    player = {}

    gameid = str(uuid.uuid4())
    game['gameid'] = gameid
    player['holdcards'] = []
    player['playerid'] = gameid
    player['nickname'] = [nickname if nickname != '' else gameid][0]
    game['players'].append(player)

    # app.logger.debug(gameid)
    # app.logger.debug(game)
    cache.set(gameid, game)
    return gameid


# re:wait the game
@app.route('/<gameid>/waiting')
def waiting_game(gameid):
    game = cache.get(gameid)
    game['status'] = 'waiting'
    cache.set(gameid, game)
    return 'reset game status'


# join the game
@app.route('/<gameid>/join')
@app.route('/<gameid>/join/<nickname>')
def join_game(gameid, nickname=''):
    game = cache.get(gameid)
    if game['status'] == 'waiting':
        player = {}

        playerid = str(uuid.uuid4())
        player['holdcards'] = []
        player['playerid'] = playerid
        player['nickname'] = [nickname if nickname != '' else playerid][0]
        game['players'].append(player)
        app.logger.debug(player)

        cache.set(gameid, game)
        return playerid + ' ,' + player['nickname'] + ' ,' + game['status']
    else:
        return 'Already started'


# start the game
@app.route('/<gameid>/start')
def start_game(gameid):
    game = cache.get(gameid)
    game['status'] = 'started'
    game['routeid'] = ''
    game['candidatelists'] = copy.copy(game['players'])
    game['loser'] = ''
    stockcards = list(range(64))

    sending = {'cardnum': 999, 'lists': []}
    game['sending'] = sending

    for player in game['players']:
        player['holdcards'] = []
        player['stacks'] = []
        player['stacktypes'] = []

    # Distribute each card to players
    idx = 0
    while len(stockcards) != 0:
        game['players'][idx]['holdcards'].append(stockcards.pop(random.randint(0, len(stockcards) - 1)))
        idx = (idx+1)%len(game['players'])

    routelist = copy.copy(game['players'])
    random.shuffle(routelist)
    game['routeid'] = routelist[0]['playerid']
    # game['candidatelists'] = [player for player in game['candidatelists'] if player['playerid'] != game['routeid']]
    for pIdx, player in enumerate(game['candidatelists']):
        if player['playerid'] == game['routeid']:
            game['candidatelists'].pop(pIdx)

    # 手札のソート
    for _player in game['players']:
        _player['holdcards'].sort(key=lambda x: x%8)

    cache.set(gameid, game)
    return 'ok'


# send card
@app.route('/<gameid>/<playerid>/send/<sendplayerid>/<int:typeid>')
@app.route('/<gameid>/<playerid>/send/<sendplayerid>/<int:typeid>/<int:cardnum>')
def choice_phase(gameid, playerid, sendplayerid, typeid, cardnum=999):
    game = cache.get(gameid)

    sendinfo = {
        'from': playerid,
        'to': sendplayerid,
        'typeid': typeid,
    }

    sending = game['sending']
    if cardnum != 999:
        sending['cardnum'] = cardnum
    sending['lists'].append(sendinfo)

    player = [player for player in game['players'] if player['playerid'] == playerid][0]
    for cIdx, card in enumerate(player['holdcards']):
        if card == cardnum:
            player['holdcards'].pop(cIdx)

    game['routeid'] = sendplayerid
    game['candidatelists'] = [player for player in game['candidatelists'] if player['playerid'] != sendplayerid]
    game['status'] = 'sending'

    cache.set(gameid, game)
    return 'ok'


# vote phase
@app.route('/<gameid>/<playerid>/judge/<int:judgeflg>')
def vote_phase(gameid, playerid, judgeflg):
    game = cache.get(gameid)

    sending = game['sending']
    lastsendinfo = sending['lists'][-1]

    if (game['sending']['cardnum'] % 8) == lastsendinfo['typeid'] and judgeflg == 0:
        player = [player for player in game['players'] if player['playerid'] == lastsendinfo['from']][0]
        message = 'せいかい'
    elif (game['sending']['cardnum'] % 8) != lastsendinfo['typeid'] and judgeflg == 1:
        player = [player for player in game['players'] if player['playerid'] == lastsendinfo['from']][0]
        message = 'せいかい'
    else:
        player = [player for player in game['players'] if player['playerid'] == lastsendinfo['to']][0]
        message = 'まちがい'

    player['stacks'].append(sending['cardnum'])

    stacks = np.array(player['stacks'])
    stacks = stacks % 8
    player['stacktypes'] = stacks.tolist()
    c = collections.Counter(stacks)

    if c.most_common()[0] == 4:
        game['loser'] = player['playerid']
        game['status'] = 'end'
        cache.set(gameid, game)
        return 'おわりです'

    game['routeid'] = player['playerid']
    game['sending'] = {'cardnum': 999, 'lists': []}
    game['candidatelists'] = copy.copy(game['players'])
    for pIdx, player in enumerate(game['candidatelists']):
        if player['playerid'] == game['routeid']:
            game['candidatelists'].pop(pIdx)
    game['status'] = 'started'

    cache.set(gameid, game)
    return message


# all status the game
@app.route('/<gameid>/status')
def game_status(gameid):
    game = cache.get(gameid)

    return json.dumps(game)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
    # app.run(debug=True)
