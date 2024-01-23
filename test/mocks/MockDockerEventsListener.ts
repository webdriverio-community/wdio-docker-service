import DockerEventsListener from '@/utils/dockerEventsListener.ts';
import MockForkedProcess from './MockForkedProcess.ts';

class DockerEventsListenerForTests extends DockerEventsListener {
    declare _subprocess: MockForkedProcess | null;
    public declare _onMessage: (message: { type: string; message: string }) => void;
}

export default DockerEventsListenerForTests;
