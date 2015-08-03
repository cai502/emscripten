var LibraryDispatch = {
    $DISPATCH__deps: [],
    $DISPATCH__postset: "DISPATCH.init();",
    $DISPATCH: {
        currentQueue: 1,
        queueList: [],
        queueMax: 0,
        init: function() {
            // 0: reserved
            // 1: main
            // 2,4,6,8: high -> background
            // 3,5,7,9: high -> background (overcommit)
            for(var i = 0; i < 10; i++) {
                DISPATCH.queueList[i] = {
                    label: "queueList"+i,
                    labelBuf: null,
                    target: null,
                    concurrent: i%2 == 0,
                    suspend: false,
                    queue: [],
                    tsd: {},
                    tsdDtor: {},
                };
            }
            queueMax = i;
        },
        async: function(queue, ctx, func) {
            DISPATCH.queueList[queue].queue.push({ctx:ctx, func:func});
        },
        sync: function(queue, ctx, func) {
            throw "unimplemented";
        },
        create: function(label, attr) {
            var queue = DISPATCH.queueMax++;
            DISPATCH.queueList[queue] = {
                label: Pointer_stringify(label),
                labelBuf: null,
                target: 4, // low priority
                conccurent: attr == 0,
                suspend: false,
                queue: []
            };
            return queue;
        },
        getLabel: function(queue) {
            var q = DISPATCH.queueList[queue];
            if(!q.labelBuf) {
                q.labelBuf = _malloc(q.label.length+1);
                writeAsciiToMemory(q.label, q.labelBuf);
            }
            return q.labelBuf;
        },
        setTargetQueue: function(obj, queue) {
            throw "unimplemented";
        },
        getSpecific: function(queue, key) {
            return DISPATCH.queueList[queue].tsd[key];
        },
        setSpecific: function(queue, key, value, dtor) {
            var prevValue = DISPATCH.queueList[queue].tsdDtor[key];
            var prevDtor = DISPATCH.queueList[queue].tsdDtor[key];
            if(prevValue && prevDtor) {
                dynCall_vi(prevDtor, prevValue);
            }

            DISPATCH.queueList[queue].tsd[key] = value;
            DISPATCH.queueList[queue].tsdDtor[key] = dtor;
        },
        selectNextQueue: function() {
            var queue;
            var queueList = DISPATCH.queueList;
            for(var i = 0; i < queueList.length; i++) {
                var queue = queueList[i];
                if(!queue.suspend && queue.queue.length > 0) {
                    DISPATCH.currentQueue = i;
                    return queue;
                }
            }
            return null;
        },
        handleQueue: function() {
            var queue = DISPATCH.selectNextQueue();
            if(!queue) return;
            var task = queue.queue.shift();
            dynCall_vi(task.func, task.ctx);
        }
    },

    dispatch_async_f: function(queue, ctx, func) {
        DISPATCH.async(queue, ctx, func);
    },
    dispatch_sync_f: function(queue, ctx, func) {
        DISPATCH.sync(queue, ctx, func);
    },
    dispatch_get_current_queue: function() {
        return DISPATCH.currentQueue;
    },
    dispatch_queue_create: function(label, attr) {
        return DISPATCH.queueCreate(label, attr);
    },
    dispatch_queue_get_label: function() {
        return DISPATCH.getLabel(queue);
    },
    dispatch_set_target_queue: function(obj, queue) {
        DISPATCH.setTargetQueue(obj, queue);
    },
    dispatch_after_f: function(when, queue, ctx, func) {
        DISPATCH.after(when, queue, ctx, func);
    },
    dispatch_barrier_async_f: function(queue, ctx, func) {
        DISPATCH.barrierAsync(queue, ctx, func);
    },
    dispatch_get_specific: function() {
        return DISPATCH.getSpecific(queue, key);
    },
    dispatch_queue_set_specific: function(queue, key, value, dtor) {
        return DISPATCH.setSpecific(queue, key, value, dtor);
    },
    _dispatch_em_handle_queue: function() {
        DISPATCH.handleQueue(); 
    }

};

autoAddDeps(LibraryDispatch, '$DISPATCH');
mergeInto(LibraryManager.library, LibraryDispatch);
