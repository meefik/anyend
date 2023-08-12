export const TIMEOUT = 20;
export default [
    {
        path: '/timeout',
        method: 'get',
        async middleware(req, res, next) {
            setTimeout(() => {
                res.send('That\'s the response after delay...');
            }, TIMEOUT * 1000);
        }
    }
]