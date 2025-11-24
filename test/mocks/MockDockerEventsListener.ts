import DockerEventsListener from '@root/utils/dockerEventsListener.ts'
import type MockForkedProcess from './MockForkedProcess.ts'

class DockerEventsListenerForTests extends DockerEventsListener {
    declare _subprocess: MockForkedProcess | null
    public declare _onMessage: (message: { type: string; message: string }) => void
}

export default DockerEventsListenerForTests
