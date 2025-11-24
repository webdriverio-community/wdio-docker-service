import fetch from 'node-fetch'

function Ping(url: URL) {
    return fetch(url)
}

export default Ping
