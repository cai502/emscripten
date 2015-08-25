var LibraryDispatch = {
    $DISPATCH__deps: [],
    $DISPATCH__postset: "DISPATCH.init();",
    $DISPATCH: {
        currentQueueId: 0,
        queueList: [],
        sourceList: [],
        groupList: [],
        queueIdNext: 0,
        sourceIdNext: 0,
        groupIdNext: 0,
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
                    tsdDtor: {}
                };
            }
            DISPATCH.queueIdNext = i;
        },
        SourceType: {
            Timer: 1
        },
        pointerToId: function(pointer) {
            return {{{ makeGetValue('pointer', 4, 'i32') }}};
        },
        getQueue: function(qp) {
            return DISPATCH.queueList[DISPATCH.pointerToId(qp)];
        },
        getSource: function(sp) {
            return DISPATCH.sourceList[DISPATCH.pointerToId(sp)];
        },
        getGroup: function(gp) {
            return DISPATCH.groupList[DISPATCH.pointerToId(gp)];
        },
        nanoSec2MilliSec: function(low, high) {
            if(low < 0) low += 0x100000000;
            if(high < 0) high += 0x100000000;
            return (low/1000000 + (high * (0x100000000 /1000000)))|0;
        },
        async: function(qp, ctx, func) {
            DISPATCH.getQueue(qp).tasks.push({ctx:ctx, func:func});
        },
        sync: function(qp, ctx, func) {
            var currentQueueId = DISPATCH.currentQueueId;
            var queueId = DISPATCH.pointerToId(qp);
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
                tasks: [],
                tsd: {},
                tsdDtor: {}
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
        after: function(when, qp, ctx, func) {
            setTimeout(function() {
                var queue = DISPATCH.getQueue(qp);
                queue.tasks.push({ctx:ctx, func:func});
            }, when - _emscripten_get_now());
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
            if(typeof task.groupId !== "undefined") {
                var group = DISPATCH.groupList[task.groupId];
                DISPATCH._groupLeave(group);
            }
        },
        sourceCreate: function(type, handle, mask, qp) {
            var sourceId = DISPATCH.sourceIdNext++;
            DISPATCH.sourceList[sourceId] = {
                type: type,
                handle: handle,
                mask: mask,
                queueId: DISPATCH.pointerToId(qp)
            };
            return sourceId;
        },
        sourceSetTimer: function(sp, start, interval, leeway) {
            var source = DISPATCH.getSource(sp);
            if(source.type != DISPATCH.SourceType.Timer) throw new Error("not a timer source");
            source.start = start;
            source.interval = interval;

            var queueing = function(source) {
                var event = source.event;
                var queue = DISPATCH.queueList[source.queueId];
                queue.tasks.push({ctx: event.ctx, func: event.func});
                if(source.interval) {
                    source.timeoutId = setTimeout(queueing, source.interval, source);
                }
            };
            source.timeoutId = setTimeout(queueing, start - _emscripten_get_now(), source);
        },
        sourceSetEventHandler: function(sp, ctx, func, dtor) {
            var source = DISPATCH.getSource(sp);
            source.event = {ctx: ctx, func:func, dtor:dtor}; 
        },
        sourceSetCancelHandler: function(sp, ctx, func, dtor) {
            var source = DISPATCH.getSource(sp);
            source.cancel = {ctx: ctx, func:func, dtor:dtor}; 
        },
        sourceCancel: function(sp) {
            var source = DISPATCH.getSource(sp);
            clearTimeout(source.timeoutId); 
            var cancel = source.cancel;
            if(cancel) {
                dynCall_vi(cancel.func, cancel.ctx);  // should call async?   
            }
        },
        groupCreate: function() {
            var groupId = DISPATCH.groupIdNext++;
            DISPATCH.groupList[groupId] = {
                count: 0,
                notifies: []
            };
            return groupId;
        },
        groupAsync: function(gp, qp, ctx, func) {
            var groupId = DISPATCH.pointerToId(gp);
            DISPATCH.groupEnter(gp);
            DISPATCH.getQueue(qp).tasks.push({ctx:ctx, func:func, groupId:groupId});
        },
        groupWait: function(gp, timeout) {
            var group = DISPATCH.getGroup(gp);
            if(group.count > 0) {
                throw new Error("dead lock!");
            }
        },
        groupNotify: function(gp, qp, ctx, func) {
            var group = DISPATCH.getGroup(gp);
            var queueId = DISPATCH.pointerToId(qp);
            DISPATCH.groupEnter(gp);
            group.notifies.push({queueId: queueId, ctx:ctx, func:func});
            DISPATCH._groupLeave(group);
        },
        groupEnter: function(gp) {
            var group = DISPATCH.getGroup(gp);
            group.count++;
        },
        groupLeave: function(gp) {
            var group = DISPATCH.getGroup(gp);
            DISPATCH._groupLeave(group);
        },
        _groupLeave: function(group) {
            group.count--;
            if(group.count == 0) {
                while(group.notifies.length > 0) {
                    var notify = group.notifies.shift();
                    var queue = DISPATCH.queueList[notify.queueId];
                    queue.tasks.push({ctx:notify.ctx, func:notify.func});
                }
            }
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
    dispatch_after_f: function(when_low, when_high, queue, ctx, func) {
        DISPATCH.after(DISPATCH.nanoSec2MilliSec(when_low, when_high), queue, ctx, func);
    },
    dispatch_barrier_async_f: function(queue, ctx, func) {
        DISPATCH.async(queue, ctx, func);
    },
    dispatch_barrier_sync_f: function(queue, ctx, func) {
        DISPATCH.async(queue, ctx, func);
    },
    dispatch_queue_get_specific: function(queue, key) {
        return DISPATCH.getSpecific(queue, key);
    },
    dispatch_queue_set_specific: function(queue, key, value, dtor) {
        return DISPATCH.setSpecific(queue, key, value, dtor);
    },
    _dispatch_em_handle_queue: function() {
        DISPATCH.handleQueue(); 
    },
    _dispatch_source_create_internal: function(type, handle, mask, queue) {
        return DISPATCH.sourceCreate(type, handle, mask, queue);
    },
    dispatch_source_set_timer: function(source, start_low, start_high, interval_low, interval_high, leeway_low, leeway_high) {
        DISPATCH.sourceSetTimer(source,
                DISPATCH.nanoSec2MilliSec(start_low, start_high),
                DISPATCH.nanoSec2MilliSec(interval_low, interval_high),
                DISPATCH.nanoSec2MilliSec(leeway_low, leeway_high)
        );
    },
    _dispatch_source_set_event_handler_internal: function(source, ctx, func, dtor) {
        DISPATCH.sourceSetEventHandler(source, ctx, func, dtor);
    },
    _dispatch_source_set_cancel_handler_internal: function(source, ctx, func, dtor) {
        DISPATCH.sourceSetCancelHandler(source, ctx, func, dtor);
    },
    dispatch_source_cancel: function(source) {
        DISPATCH.sourceCancel(source);
    },
    _dispatch_group_create_internal: function() {
        return DISPATCH.groupCreate();
    },
    dispatch_group_async_f: function(group, queue, ctx, func) {
        DISPATCH.groupAsync(group, queue, ctx, func);
    },
    dispatch_group_wait: function(group, timeout) {
        DISPATCH.groupWait(group, timeout);
    },
    dispatch_group_notify_f: function(group, queue, ctx, func) {
        DISPATCH.groupNotify(group, queue, ctx, func);
    },
    dispatch_group_enter: function(group) {
        DISPATCH.groupEnter(group);
    },
    dispatch_group_leave: function(group) {
        DISPATCH.groupLeave(group);
    }
};

autoAddDeps(LibraryDispatch, '$DISPATCH');
mergeInto(LibraryManager.library, LibraryDispatch);
