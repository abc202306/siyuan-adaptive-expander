import {
    Plugin,
    getFrontend,
    fetchPost,
    IEventBusMap,
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

    // debug log event listener handler func
    private logArgsCallbackBoundThis = this.logArgsCallback.bind(this)
    // the following three are the main functional methods
    private tryExpandBlockBoundThis = this.tryExpandBlock.bind(this)
    private tryFoldBlockBoundThis = this.tryFoldBlock.bind(this)
    private tryFoldBlockWhenDestoryProtypeBoundThis = this.tryFoldBlockWhenDestroyProtype.bind(this)

    // a list of the type-listener pairs for easy registering and unregistering
    private typeListenerPairArray: [keyof IEventBusMap,(...args:any)=>any][] = [];
    
    // status variables for log or which blocks to toggle fold/expand

    // order number for debug log message
    private fnLogArgsExecCount: number = 0;
    // a list of blocks to be recovered as folded
    private latestFoldedBlockIdArray: string[] = [];

    // the info variables
    private isMobile: boolean = false;

    // the log event listener handler func for all monitored events
    logArgsCallback(...args: any) {
        if(myDebug){
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
            const arg0 = args[0]
            let value = arg0
            let validDotSepPath = ''
            for (let pathPart of pathParts) {
                if (value && pathPart in value) {
                    validDotSepPath += (validDotSepPath ? '.' : '') + pathPart
                    value = value[pathPart]
                }
            }

            // log the specified part of the event object or the whole event object
            console.log(`${this.fnLogArgsExecCount} logArgsCallback args[0].` + validDotSepPath + '=', value)

            // extra log: log the block id if exists
            const id = args[0].detail?.protyle?.block?.id
            console.log(`${this.fnLogArgsExecCount} logArgsCallback the block id of args[0]:`, id)
        } else {
            throw new Error("Debug log is disabled. Set myDebug to true to enable it.");
        }
    }

    // adaptively expand the block and register into the blocks to be recovered as folded if it is marked as folded
    tryExpandBlock(...args: any) {
        // get the current block id from the event object
        const id = args[0].detail?.protyle?.block?.id
        // the function call debug log
        if(myDebug){
            console.log('Call tryExpandListItem ', id)
        }
        // fetch the current block attributes to check if it is marked as folded, and expand it and register it if so
        fetchPost('/api/attr/getBlockAttrs', { id: id }, response => {
            // the fetch response debug log
            if(myDebug){
                console.log('Call tryExpandListItem response:', response)
            }
            // check if the current block is marked as folded
            const data = response.data || {}
            // if so, expand it and register it into the blocks to be recovered as folded
            if (data.fold === '1') {
                // expand the current block, and register it into the blocks to be recovered as folded
                fetchPost('/api/block/unfoldBlock', { id: id }, response => {
                    // the fetch response debug log
                    if(myDebug){
                        console.log('Call tryExpandListItem unfoldBlock response:', response)
                    }    
                    // register the current block into the blocks to be recovered as folded with a slight delay to avoid abnormal UI behavior like flashing
                    setTimeout(() => {
                        // register the current block into the blocks to be recovered as folded
                        this.latestFoldedBlockIdArray.push(id);
                    },100);
                })
            }
        })
    }

    // adaptively fold back the blocks that were expanded by tryExpandBlock if they are not the current block
    tryFoldBlock(...args: any) {
        // get the current block id from the event object
        const id = args[0].detail?.protyle?.block.id
        // the function call debug log
        if(myDebug){
            console.log('Call tryFoldBlock ', id)
        }
        // fold back the blocks that were expanded by tryExpandBlock if they are not the current block
        // use a new array to store the blocks that are not folded back
        // this is to avoid modifying the array while iterating over it
        const newLatestFoldedBlockIdArray = [];
        // the debug log of the blocks to be folded back
        if(myDebug){
            console.log('this.latestFoldedBlockIdArray:', this.latestFoldedBlockIdArray)
        }
        // iterate over the blocks to be folded back
        for (let latestFoldedBlockId of this.latestFoldedBlockIdArray) {
            // fold back the block if it is not the current block
            if (latestFoldedBlockId !== id) {
                // fold back the block
                fetchPost('/api/block/foldBlock', { id: latestFoldedBlockId }, response => {
                    // the fetch response debug log
                    if(myDebug){
                        console.log('Call tryFoldBlock response:', response)
                    }
                })
            }else{
                // keep the block in the new array if it is the current block
                newLatestFoldedBlockIdArray.push(id);
            }
        }
        // update the blocks to be folded back with the new array
        this.latestFoldedBlockIdArray = newLatestFoldedBlockIdArray;
    }

    // fold back all the blocks that were expanded by tryExpandBlock when the protyle instance is destroyed
    tryFoldBlockWhenDestroyProtype(...args: any) {
        // the function call debug log
        if(myDebug){
            console.log('this.latestFoldedBlockIdArray:', this.latestFoldedBlockIdArray)
        }
        // fold back all the blocks that were expanded by tryExpandBlock
        for (let latestFoldedBlockId of this.latestFoldedBlockIdArray) {
            // fold back the block
            fetchPost('/api/block/foldBlock', { id: latestFoldedBlockId }, response => {
                // the fetch response debug log
                if(myDebug){
                    console.log('Call tryFoldBlockWhenDestroyProtype response:', response)
                }
            })
        }
        // clear the blocks to be folded back
        this.latestFoldedBlockIdArray = [];
    }

    // register and unregister event listeners

    // register the event listeners
    registerEventListeners() {
        // register the event listeners for the events to be monitored
        // bind the event listener handler funcs to this instance
        // so that they can access the instance variables and methods
        // and can be properly unregistered later

        // using the bounded funcs defined in the instance variables
        
        if(myDebug){
            // for debug log
            window.myPathVar = ''

            // repare to register the logger for debug log
            const typeListenerPairArray01: [keyof IEventBusMap,(...args:any)=>any][] = [
                'loaded-protyle-static',
                'loaded-protyle-dynamic',
                'switch-protyle',
                'destroy-protyle',
            ].map(type=>[type, this.logArgsCallbackBoundThis] as [keyof IEventBusMap,(...args:any)=>any]);
            this.typeListenerPairArray = this.typeListenerPairArray.concat(typeListenerPairArray01);
        }
        
        // repare to register the main functional methods
        const typeListenerPairArray02: [keyof IEventBusMap,(...args:any)=>any][] = [
            ['loaded-protyle-static', this.tryExpandBlockBoundThis],
            ['loaded-protyle-static', this.tryFoldBlockBoundThis],
            ['loaded-protyle-dynamic', this.tryExpandBlockBoundThis],
            ['loaded-protyle-dynamic', this.tryFoldBlockBoundThis],
            ['switch-protyle', this.tryFoldBlockBoundThis],
            ['destroy-protyle', this.tryFoldBlockWhenDestoryProtypeBoundThis],
        ];
        this.typeListenerPairArray = this.typeListenerPairArray.concat(typeListenerPairArray02);
        
        // register the event listeners using the type-listener pairs
        this.typeListenerPairArray.forEach(([type,listener])=>{
            this.eventBus.on(type, listener)
        });
    }

    // unregister the event listeners
    unregisterEventListeners() {
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
