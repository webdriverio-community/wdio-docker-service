import fetch, { Response } from 'node-fetch';

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
function Ping(url) {
    return fetch(url);
}

export default Ping;
