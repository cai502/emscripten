var LibraryDispatch = {
    $DISPATCH__deps: [],
    $DISPATCH__postset: "DISPATCH.init();",
    $DISPATCH: {
        currentQueueId: 0,
        queueList: [],
        queueIdNext: 0,
        init: function() {
            // 0: main
            // 1: background
            for(var i = 0; i < 2; i++) {
                DISPATCH.queueList[i] = {
                    label: "queueList"+i,
                    labelBuf: null,
                    target: null,
                    suspend: false,
                    tasks: [],
                    tsd: {},
                    tsdDtor: {},
                };
            }
            queueIdNext = i;
        },
        pointerToQueueId : function(qp) {
            return {{{ makeGetValue('qp', 0, 'i32') }}};;
        },
        getQueue: function(qp) {
            return DISPATCH.queueList[DISPATCH.pointerToQueueId(qp)];
        },
        async: function(qp, ctx, func) {
            DISPATCH.getQueue(qp).tasks.push({ctx:ctx, func:func});
        },
        sync: function(qp, ctx, func) {
            var currentQueueId = DISPATCH.currentQueueId;
            var queueId = DISPATCH.pointerToQueueId(qp);
            if(currentQueueId != queueId) {
                DISPATCH.currentQueueId = queueId;
                var queue = DISPATCH.queueList[queueId];
                while(queue.tasks.length > 0) {
                    var task = queue.tasks.shift();
                    dynCall_vi(task.func, task.ctx);
                }
                DISPATCH.currentQueueId = currentQueueId;
            } else {
                throw new Error("dead lock!");
                // dynCall_vi(func, ctx);
            }
        },
        queueCreate: function(label) {
            var queueId = DISPATCH.queueIdNext++;
            DISPATCH.queueList[queueId] = {
                label: Pointer_stringify(label),
                labelBuf: null,
                target: 1, // background
                suspend: false,
                tasks: []
            };
            return queueId;
        },
        getLabel: function(qp) {
            var queue = DISPATCH.getQueue(qp);
            if(!queue.labelBuf) {
                queue.labelBuf = _malloc(queue.label.length+1);
                writeAsciiToMemory(queue.label, queue.labelBuf);
            }
            return queue.labelBuf;
        },
        setTargetQueue: function(obj, queue) {
            throw new Error("unimplemented");
        },
        getSpecific: function(qp, key) {
            return DISPATCH.getQueue(qp).tsd[key];
        },
        setSpecific: function(qp, key, value, dtor) {
            var queue = DISPATCH.getQueue(qp);

            var prevValue = queue.tsd[key];
            var prevDtor = queue.tsdDtor[key];

            if(prevValue && prevDtor) {
                dynCall_vi(prevDtor, prevValue);
            }

            queue.tsd[key] = value;
            queue.tsdDtor[key] = dtor;
        },
        selectNextQueue: function() {
            var queue;
            var queueList = DISPATCH.queueList;
            for(var i = 0; i < queueList.length; i++) {
                var queue = queueList[i];
                if(!queue.suspend && queue.tasks.length > 0) {
                    DISPATCH.currentQueueId = i;
                    return queue;
                }
            }
            return null;
        },
        handleQueue: function() {
            var queue = DISPATCH.selectNextQueue();
            if(!queue) return;
            var task = queue.tasks.shift();
            dynCall_vi(task.func, task.ctx);
        }
    },

    dispatch_async_f: function(queue, ctx, func) {
        DISPATCH.async(queue, ctx, func);
    },
    dispatch_sync_f: function(queue, ctx, func) {
        DISPATCH.sync(queue, ctx, func);
    },
    _dispatch_get_current_queue_id: function() {
        return DISPATCH.currentQueueId;
    },
    _dispatch_queue_create_internal: function(label) {
        return DISPATCH.queueCreate(label);
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
