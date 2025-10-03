import {
    Plugin,
    getFrontend,
    fetchPost,
    IEventBusMap,
    IWebSocketData,
} from "siyuan";
import "./index.scss";

// config variables

// the debug flag
// set to true to enable debug logs
// set to false to disable debug logs
const myDebug = false;

// window.myPathVar is a dot-separated path string to specify which part of the event detail to log
// e.g., "detail.protyle.block.id" to log the block id
// if empty, log the whole event object
declare global {
    interface Window {
        myPathVar?: any
    }
}
window.myPathVar = ''

// a simple debug log function that only logs when myDebug is true
function logWhenDebug(...args: any) {
    if (myDebug) {
        console.log(...args);
    }
}

// the adaptive-expander plugin class
// 
// This plugin automatically expands or folds blocks based on their content when the page is loaded.
// 
// It listens to the 'loaded-protyle-static' event to check each block's attributes and decides whether to expand or fold it.
// If a block is marked as folded (fold attribute set to '1'), it will be expanded.
// The plugin keeps track of the blocks that were expanded and folds them back when the protyle instance is destroyed, using the 'destroy-protyle' event.
export default class AdaptiveExpanderPlugin extends Plugin {
    // bounded instant methods for event listeners callbacks
    // these are needed to properly register and unregister as event listeners handlers

    // the bounded instant methods for event listeners callbacks
    private cbb = {
         // debug log event listener handler func
        logArgsForDebug: this.logArgsForDebugCallback.bind(this),
        // the following three are the main functional methods
        tryExpandBlock: this.tryExpandBlockCallback.bind(this),
        tryFoldBlock: this.tryFoldBlockCallback.bind(this),
        tryFoldBlockWhenDestroyProtype: this.tryFoldBlockWhenDestroyProtypeCallback.bind(this),
    }

    // a list of the type-listener pairs for easy registering and unregistering
    private typeListenerPairArray: [keyof IEventBusMap,(...args:any)=>any][] = [
        // keep if myDebug is true, otherwise only keep the functional listeners
        ['loaded-protyle-static', this.cbb.logArgsForDebug],
        ['loaded-protyle-dynamic', this.cbb.logArgsForDebug],
        ['switch-protyle', this.cbb.logArgsForDebug],
        ['destroy-protyle', this.cbb.logArgsForDebug],

        // always keep the following lines for the main functional listeners

        // these are the main functional listeners, always keep them
        // no matter whether myDebug is true or false
        // the functional listeners
        ['loaded-protyle-static', this.cbb.tryExpandBlock],
        ['loaded-protyle-static', this.cbb.tryFoldBlock],
        ['loaded-protyle-dynamic', this.cbb.tryExpandBlock],
        ['loaded-protyle-dynamic', this.cbb.tryFoldBlock],
        ['switch-protyle', this.cbb.tryFoldBlock],
        ['destroy-protyle', this.cbb.tryFoldBlockWhenDestroyProtype]
    ].filter(([_,listener])=> myDebug || listener!==this.cbb.logArgsForDebug) as [keyof IEventBusMap,(...args:any)=>any][];
    
    // status variables for log or which blocks to toggle fold/expand

    // order number for debug log message
    private fnLogArgsExecCount: number = 0;
    // a list of blocks to be recovered as folded
    private latestFoldedBlockIdArray: string[] = [];

    // the info variables
    private isMobile: boolean = false;

    // the log event listener handler func for all monitored events
    public logArgsForDebugCallback(...args: any) {
        if (!myDebug){
            throw new Error("Debug log is disabled. Set myDebug to true to enable it.");
        }

        // increment the call count (call order number)
        this.fnLogArgsExecCount += 1;
        // log the call count (call order number)
        console.log(`logArgsCallback called ${this.fnLogArgsExecCount} times`)
        
        // log the specified part of the event object or the whole event object

        // resolve the dot-separated path string to get the specified part of the event object
        // if the path is invalid or empty, log the whole event object
        // e.g., window.myPathVar = 'detail.protyle.block.id' to log the block id
        // e.g., window.myPathVar = '' to log the whole event object
        const pathParts = window.myPathVar?.split('.') || []

        // calculate the specified part of the event object and the hint string
        const arg0 = args[0];
        let value = arg0;
        let validDotSepPath = '';
        for (let pathPart of pathParts) {
            if (value && pathPart in value) {
                validDotSepPath += "." + pathPart;
                value = value[pathPart];
            } else {
                break;
            }
        }

        // log the specified part of the event object or the whole event object
        console.log(`${this.fnLogArgsExecCount} logArgsCallback args[0]` + validDotSepPath + '=', value)

        // extra log: log the block id if exists
        const id = args[0].detail?.protyle?.block?.id
        console.log(`${this.fnLogArgsExecCount} logArgsCallback the block id of args[0]:`, id)
    }

    // adaptively expand the block and register into the blocks to be recovered as folded if it is marked as folded
    public async tryExpandBlockCallback(...args: any) {
        // get the current block id from the event object
        const id = args[0].detail?.protyle?.block?.id

        // the function call debug log
        logWhenDebug('Call tryExpandListItem ', id)

        const response01: IWebSocketData = await new Promise(resolve => fetchPost(
            '/api/attr/getBlockAttrs', { id: id }, response => resolve(response)
        ))
        
        // the fetch response debug log
        logWhenDebug('Call tryExpandListItem response:', response01)
        // check if the current block is marked as folded
        const data = response01.data || {}

        // if not marked as folded, return
        if (data.fold !== "1") {
            return;
        }

        const response02: IWebSocketData = await new Promise(resolve => fetchPost(
            '/api/block/unfoldBlock', { id: id }, response => resolve(response)
        ))

        // the fetch response debug log
        logWhenDebug('Call tryExpandListItem unfoldBlock response:', response02)

        // register the current block into the blocks to be recovered as folded with a slight delay to avoid abnormal UI behavior like flashing
        setTimeout(() => {
            // register the current block into the blocks to be recovered as folded
            this.latestFoldedBlockIdArray.push(id);
        },100);
    }

    // adaptively fold back the blocks that were expanded by tryExpandBlock if they are not the current block
    public async tryFoldBlockCallback(...args: any) {
        // get the current block id from the event object
        const id = args[0].detail?.protyle?.block.id + "";

        // the function call debug log
        logWhenDebug('Call tryFoldBlock ', id)

        // fold back the blocks that were expanded by tryExpandBlock if they are not the current block
        // use a new array to store the blocks that are not folded back
        // this is to avoid modifying the array while iterating over it

        // the debug log of the blocks to be folded back
        logWhenDebug('this.latestFoldedBlockIdArray:', this.latestFoldedBlockIdArray)

        // iterate over the blocks to be folded back
        for (let latestFoldedBlockId of this.latestFoldedBlockIdArray.filter(bid=>bid !== id)) {
            // fold back the block if it is not the current block
            // fold back the block
            const response: IWebSocketData = await new Promise(resolve => fetchPost(
                '/api/block/foldBlock', { id: latestFoldedBlockId }, response => resolve(response)
            ))
            
            // the fetch response debug log
            logWhenDebug('Call tryFoldBlock response:', response)
        }

        // update the blocks to be folded back with the new array
        this.latestFoldedBlockIdArray = this.latestFoldedBlockIdArray.includes(id) ? [id] : [];
    }

    // fold back all the blocks that were expanded by tryExpandBlock when the protyle instance is destroyed
    public async tryFoldBlockWhenDestroyProtypeCallback(...args: any) {
        // the function call debug log
        logWhenDebug('this.latestFoldedBlockIdArray:', this.latestFoldedBlockIdArray)

        // fold back all the blocks that were expanded by tryExpandBlock
        for (let latestFoldedBlockId of this.latestFoldedBlockIdArray) {
            // fold back the block
            const response: IWebSocketData = await new Promise(resolve => fetchPost(
                '/api/block/foldBlock', { id: latestFoldedBlockId }, response => resolve(response)
            ))

            // the fetch response debug log
            logWhenDebug('Call tryFoldBlockWhenDestroyProtype response:', response)
        }
        // clear the blocks to be folded back
        this.latestFoldedBlockIdArray = [];
    }

    // register and unregister event listeners

    // register the event listeners
    private registerEventListeners() {
        // register the event listeners for the events to be monitored
        // bind the event listener handler funcs to this instance
        // so that they can access the instance variables and methods
        // and can be properly unregistered later

        // using the bounded funcs defined in the instance variables

        // register the event listeners using the type-listener pairs
        this.typeListenerPairArray.forEach(([type,listener])=>{
            this.eventBus.on(type, listener)
        });
    }

    // unregister the event listeners
    private unregisterEventListeners() {
        // unregister the event listeners using the type-listener pairs
        this.typeListenerPairArray.forEach(([type,listener])=>{
            this.eventBus.off(type, listener)
        });
    }
    
    // plugin lifecycle methods

    // called when the plugin is loaded
    // should initialize anything needed
    // including registering event listeners 
    onload() {
        logWhenDebug("typeListenerPairArray", this.typeListenerPairArray);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.registerEventListeners();
    }

    // called when the plugin is disabled
    // or when the app is closed
    // should undo anything done in onload
    // including unregistering event listeners
    // and stopping any background tasks
    onunload() {
        this.unregisterEventListeners();
    }

    // called when the plugin is uninstalled
    // should clean up anything that would persist after the plugin is uninstalled
    // such as settings and data stored in the database
    uninstall() {
        console.log("uninstall");
    }
}
