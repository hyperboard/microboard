import { describe, expect, test, mock, spyOn, beforeEach } from 'bun:test';
import { authenticatedFetch } from './AuthRequest';
import { conf } from '../Settings';

describe('authenticatedFetch', () => {
    beforeEach(() => {
        // Reset mocks and conf
        mock.restore();
        conf.getAccessToken = () => 'test-token';
        conf.onAuthInvalid = async () => true;
        conf.onAuthTerminalFailure = () => {};
    });

    test('should inject Bearer token from conf.getAccessToken()', async () => {
        const fetchMock = mock((url, init) => {
            expect(init.headers.get('Authorization')).toBe('Bearer test-token');
            return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        });
        globalThis.fetch = fetchMock;

        await authenticatedFetch('https://api.example.com/data');
        expect(fetchMock).toHaveBeenCalled();
    });

    test('should retry exactly once on 401 AUTH_INVALID_ACCESS_TOKEN if onAuthInvalid returns true', async () => {
        let callCount = 0;
        const fetchMock = mock((url, init) => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve(new Response(JSON.stringify({ code: 'AUTH_INVALID_ACCESS_TOKEN' }), { status: 401 }));
            }
            return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        });
        globalThis.fetch = fetchMock;

        const onAuthInvalidSpy = spyOn(conf, 'onAuthInvalid');

        const response = await authenticatedFetch('https://api.example.com/data', {}, 'test-board');
        
        expect(callCount).toBe(2);
        expect(onAuthInvalidSpy).toHaveBeenCalledWith('test-board');
        expect(response.status).toBe(200);
    });

    test('should NOT retry if onAuthInvalid returns false', async () => {
        const fetchMock = mock(() => {
            return Promise.resolve(new Response(JSON.stringify({ code: 'AUTH_INVALID_ACCESS_TOKEN' }), { status: 401 }));
        });
        globalThis.fetch = fetchMock;

        conf.onAuthInvalid = async () => false;
        const onAuthTerminalFailureSpy = spyOn(conf, 'onAuthTerminalFailure');

        const response = await authenticatedFetch('https://api.example.com/data', {}, 'test-board');
        
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(onAuthTerminalFailureSpy).toHaveBeenCalledWith('test-board', 'AUTH_INVALID_ACCESS_TOKEN');
        expect(response.status).toBe(401);
    });

    test('should NOT retry on other 401 codes', async () => {
        const fetchMock = mock(() => {
            return Promise.resolve(new Response(JSON.stringify({ code: 'AUTH_MISSING_ACCESS_TOKEN' }), { status: 401 }));
        });
        globalThis.fetch = fetchMock;

        const onAuthInvalidSpy = spyOn(conf, 'onAuthInvalid');

        const response = await authenticatedFetch('https://api.example.com/data');
        
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(onAuthInvalidSpy).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
    });

    test('should throw error if fetch fails (network error)', async () => {
        globalThis.fetch = mock(() => Promise.reject(new Error('Network Error')));

        expect(authenticatedFetch('https://api.example.com/data')).rejects.toThrow('Network Error');
    });
});
