declare var __webpack_public_path__: string;
declare var __MICRO_APP_BASE_ROUTE__: string | undefined;

interface Wujie {
    bus: EventBus;
}

interface EventBus {
    id: string;
    eventObj: Map<String, EventObj>;
    $emit: (event: string, ...args: Array<any>) => void;
    $on: (event: string, fn: (...args: Array<any>) => void) => void;
}

type EventObj = { [event: string]: Array<Function> };

declare interface Window {
    __POWERED_BY_WUJIE__: boolean | undefined;
    __WUJIE_MOUNT: () => void | undefined;
    __WUJIE_UNMOUNT: () => void | undefined;
    $wujie: Wujie | undefined;
}