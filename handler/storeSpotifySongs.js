'use strict';

const axios = require('axios');
const { DateTime, Settings } = require('luxon');
const getObject = require('./helpers/getObject');
const getSecrets = require('./helpers/getSecrets');
const log = require('./helpers/log');
const putObject = require('./helpers/putObject');
const putSecret = require('./helpers/putSecret');
const toBase64 = require('./helpers/toBase64');

Settings.defaultZoneName = 'America/New_York';

/**
 * Authenticate with a Spotify application
 *
 * 1. register app, https://developer.spotify.com/dashboard/applications
 * 2. read "Authorization Code Flow", https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow
 * 3. visit, https://accounts.spotify.com/en/authorize?client_id=<SPOTIFY_CLIENT_ID>&response_type=code&redirect_uri=<SPOTIFY_REDIRECT_URL>&scope=user-read-recently-played
 * 4. use code from response and run, curl -H "Authorization: Basic <SPOTIFY_CLIENT_ID:SPOTIFY_CLIENT_SECRET~>base64>" -d grant_type=authorization_code -d code=<code> -d redirect_uri=https%3A%2F%2Fbrianpatrickkemper.com%2Foauth https://accounts.spotify.com/api/token
 * 5. store refresh_token as SPOTIFY_REFRESH_TOKEN
 *
 * see, https://developer.spotify.com/documentation/general/guides/authorization-guide/#authorization-code-flow
 */

module.exports = async function storeSpotifySongs({ BUCKET, NOW = DateTime.local().toISO() }) {
  const today = DateTime.fromISO(NOW).toISODate();

  // Get secrets
  const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN
  } = await getSecrets('SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN');

  // Get previously collected songs
  const prevSongs = await getObject({ bucket: BUCKET, key: `${today}.json` });

  // Get access token
  // note, Client Credentials Flow does not allow access to /v1/me endpoints
  const { data: { access_token:accessToken }} = await axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: `Basic ${toBase64(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: `grant_type=refresh_token&refresh_token=${SPOTIFY_REFRESH_TOKEN}`,
    timeout: 60 * 1000
  });

  // Get list of recently played music
  // see, https://developer.spotify.com/documentation/web-api/reference/player/get-recently-played/
  const response = await axios({
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    params: {
      before: NOW,
      // note, this should be more than comfortable with fetching every five minutes even if an
      // error happens
      limit: 50
    },
    timeout: 60 * 1000
  });

  // Transform
  // note, I don't want to store everything
  const normalized = response.data.items.reduce((songs, song) => {
    const {
      context,
      played_at: playedAt,
      track: {
        artists,
        duration_ms: duration,
        external_ids: { isrc },
        external_urls: { spotify: url },
        id,
        name,
        popularity
      }
    } = song;
    const artistNames = artists.map(({ name }) => name);

    const isDuplicate = Boolean(songs.find((song => song.id === id && song.playedAt === playedAt)));
    const wasPlayedToday = playedAt.startsWith(today);

    if (!wasPlayedToday || isDuplicate) { // then ignore
      return songs;
    }

    return [...songs, { artists: artistNames, duration, id, isrc, name, playedAt, url }];
  }, prevSongs);

  // Load
  await putObject({ bucket: BUCKET, key: `${today}.json`, data: normalized });

  log({ today, size: normalized.length });
}
