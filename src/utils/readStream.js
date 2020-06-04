export default function readStream(stream) {
    if (!stream) return Promise.reject('Invalid stream');

    return new Promise((resolve => {
        const buffer = [];

        stream.setEncoding('utf8');
        stream.on('data', (chunk) => {
            buffer.push(chunk);
        });

        stream.on('end', () => {
            resolve(buffer.join(''));
        });
    }));
}
