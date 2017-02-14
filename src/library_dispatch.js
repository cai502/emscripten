var LibraryDispatch = {
    $DISPATCH__deps: [],
    $DISPATCH__postset: "DISPATCH.init();",
    $DISPATCH: {
        currentQueue: null,
        init: function() {
            // ================================================================================
            // List
            // ================================================================================
            function ObjectList() {
                this.list = [];
                this.nextId = 0;
            }
            ObjectList.prototype.add = function(obj) {
                obj.id = this.nextId++;
                this.list[obj.id] = obj;
            };
            ObjectList.prototype.get = function(id) {
                return this.list[id];
            };

            var queueList = new ObjectList();
            var sourceList = new ObjectList();
            var groupList = new ObjectList();

            // ================================================================================
            // Queue
            // ================================================================================
            function Queue(label) {
                this.id = null;
                this.label = label;
                this.labelBuf = null;
                this.target = null;
                this.suspend = 0;
                this.tasks = [];
                this.tsd = {};
                this.tsdDtor = {};
            };
            Queue.prototype.getLabel = function() {
                if(!this.labelBuf) {
                    this.labelBuf = _malloc(this.label.length+1);
                    writeAsciiToMemory(this.label, this.labelBuf);
                }
                return this.labelBuf;
            };
            Queue.prototype.flush = function() {
                while(this.tasks.length > 0) {
                    var task = this.tasks.shift();
                    task.execute();
                }
            };
            Queue.prototype.getSpecific = function(key) {
                return this.tsd[key];
            };
            Queue.prototype.setSpecific = function(key, value, dtor) {
                var prevValue = this.tsd[key];
                var prevDtor = this.tsdDtor[key];

                if(prevValue && prevDtor) {
                    dynCall_vi(prevDtor, prevValue);
                }

                this.tsd[key] = value;
                this.tsdDtor[key] = dtor;
            };
            var mainQueue = new Queue("queueMain");
            var backgroundQueue = new Queue("queueBackground");
            queueList.add(mainQueue);
            queueList.add(backgroundQueue);
            DISPATCH.currentQueue = mainQueue;

            // ================================================================================
            // Source
            // ================================================================================
            function Source(type, handle, mask, queue) {
                this.id = null;

                // common
                this.type = type;
                this.handle = handle;
                this.mask = mask;
                this.queue = queue;
                this.canceled = 0;
                this.suspendCount = 1;
                this.eventHandler = null;
                this.cancelHandler = null;

                // timer events
                this.interval = 0;
                this.start = 0;
                this.timeoutId = 0;
            }
            Source.Type = {
                Timer: 1
            };
            Source.specialPriorityBits = 10;
            Source.specialPriorityMax = 7;
            Source.specialEvents = [];
            Source.prototype.specialPriority = function() {
                // If "specialPriority" > 0, the source will be executed every tick.
                return (this.mask >> Source.specialPriorityBits) & Source.specialPriorityMax;
            };
            Source.prototype.timerStart = function() {
                if(this.specialPriority() > 0) {
                    this.timerStartSpecial();
                } else {
                    this.timerStartNormal();
                }
            };
            Source.prototype.timerStartSpecial = function() {
                Source.specialEvents[this.specialPriority()-1] = this;
            };
            Source.prototype.timerStartNormal = function() {
                var queueing = function(source) {
                    var event = source.eventHandler;
                    if(!source.suspendCount) {
                        source.queue.tasks.push(event);
                    }
                    if(source.interval) {
                        source.timeoutId = setTimeout(queueing, source.interval, source);
                    }
                };
                this.timeoutId = setTimeout(queueing, this.start - _emscripten_get_now(), this);
            };
            Source.prototype.timerCancel = function() {
                if(this.canceled) return;

                if(this.specialPriority() > 0) {
                    this.timerCancelSpecial();
                } else {
                    this.timerCancelNormal();
                }

                this.executeCancelHandler();
            };
            Source.prototype.timerCancelSpecial = function() {
                delete Source.specialEvents[this.specialPriority()-1];
            };
            Source.prototype.timerCancelNormal = function() {
                clearTimeout(this.timeoutId);
            };
            Source.prototype.executeCancelHandler = function() {
                var cancel = this.cancelHandler;
                if(cancel) {
                    if(this.suspendCount) {
                        this.canceled = 1; // cancel handler pending
                        return;
                    } else {
                        this.canceled = 2;
                        source.queue.tasks.push(cancel);
                    }
                } else {
                    this.canceled = 2;
                }
            };
            Source.prototype.suspend = function() {
                this.suspendCount++;
            }
            Source.prototype.resume = function() {
                this.suspendCount--;
                if(this.canceled == 1) {
                    this.canceled = 2;
                    source.queue.tasks.push(source.cancelHandler);
                }
            }

            // ================================================================================
            // Task
            // ================================================================================
            function Task(ctx, func) {
                this.ctx = ctx;
                this.func = func;
                this.dtor = null; // for source event
                this.group = null;
                this.queue = null; // for group leave
            }
            Task.prototype.execute = function() {
                dynCall_vi(this.func, this.ctx);
	            if(this.group) {
                    this.group.leave();
	            }
            }

            // ================================================================================
            // Grooup
            // ================================================================================
            function Group() {
                this.count = 0;
                this.notifies = [];
            }
            Group.prototype.enter = function() {
                this.count++;
            }
            Group.prototype.leave = function() {
                this.count--;
                if(this.count == 0) {
                    while(this.notifies.length > 0) {
                        var notify = this.notifies.shift();
                        var queue = notify.queue;
                        queue.tasks.push(notify);
                    }
                }
            }

            // ================================================================================
            // APIs
            // ================================================================================
            DISPATCH.async = function(queueId, ctx, func) {
                var queue = queueList.get(queueId);
                queue.tasks.push(new Task(ctx, func));
            };
            DISPATCH.sync = function(queueId, ctx, func) {
                var queue = queueList.get(queueId);
                if(DISPATCH.currentQueue == queue) {
                    throw new Error("dead lock!");
                }

                var currentQueueSave = DISPATCH.currentQueue;
                DISPATCH.currentQueue = queue;
                queue.flush();
                dynCall_vi(func, ctx);
                DISPATCH.currentQueue = currentQueueSave;
            };
            DISPATCH.apply = function(iter, queueId, ctx, func) {
                var queue = queueList.get(queueId);
                if(DISPATCH.currentQueue == queue) {
                    throw new Error("dead lock!");
                }

                var currentQueueSave = DISPATCH.currentQueue;
                DISPATCH.currentQueue = queue;
                queue.flush();
                for(var i = 0; i < iter; i++) {
                    dynCall_vii(func, ctx, i);
                }
                DISPATCH.currentQueue = currentQueueSave;
            };
            DISPATCH.queueCreate = function(label) {
                var queue = new Queue(Pointer_stringify(label));
                queue.target = 1;
                queueList.add(queue);
                return queue.id;
            };
            DISPATCH.getLabel = function(queueId) {
                var queue = queueList.get(queueId);
                return queue.getLabel();
            };
            DISPATCH.setTargetQueue = function(obj, queue) {
                throw new Error("unimplemented");
            };
            DISPATCH.after = function(when, queueId, ctx, func) {
                setTimeout(function() {
                    var queue = queueList.get(queueId);
                    queue.tasks.push(new Task(ctx, func));
                }, when - _emscripten_get_now());
            };
            DISPATCH.getSpecific = function(queueId, key) {
                var queue = queueList.get(queueId);
                return queue.getSpecific(key);
            };
            DISPATCH.setSpecific = function(queueId, key, value, dtor) {
                var queue = queueList.get(queueId);
                return queue.setSpecific(key, value, dtor);
            };

            DISPATCH.sourceCreate = function(type, handle, mask, queueId) {
                var queue = queueList.get(queueId);
                var source = new Source(type, handle, mask, queue);
                sourceList.add(source);
                return source.id;
            };
            DISPATCH.sourceSetTimer = function(sourceId, start, interval, leeway) {
                var source = sourceList.get(sourceId);
                if(source.type != Source.Type.Timer) throw new Error("not a timer source");

                source.start = start;
                source.interval = interval;
                source.timerStart();
            };
            DISPATCH.sourceSetEventHandler = function(sourceId, ctx, func, dtor) {
                var source = sourceList.get(sourceId);
                var task = new Task(ctx, func);
                task.dtor = dtor;
                source.eventHandler = task;
            };
            DISPATCH.sourceSetCancelHandler = function(sourceId, ctx, func, dtor) {
                var source = sourceList.get(sourceId);
                var task = new Task(ctx, func);
                task.dtor = dtor;
                source.cancelHandler = task;
            };
            DISPATCH.sourceCancel = function(sourceId) {
                var source = sourceList.get(sourceId);
                if(source.type != Source.Type.Timer) throw new Error("not a timer source");

                source.timerCancel();
            },
            DISPATCH.sourceSuspend = function(sourceId) {
                var source = sourceList.get(sourceId);
                source.suspend();
            };
            DISPATCH.sourceResume = function(sourceId) {
                var source = sourceList.get(sourceId);
                source.resume();
            };

            DISPATCH.groupCreate = function() {
                var group = new Group();
                groupList.add(group);
                return group.id;
            };
            DISPATCH.groupAsync = function(groupId, queueId, ctx, func) {
                var group = groupList.get(groupId);
                var queue = queueList.get(queueId);

                group.enter();
                var task = new Task(ctx, func);
                task.group = group;
                queue.tasks.push(task);
            };
            DISPATCH.groupWait = function(groupId, timeout) {
                var group = groupList.get(groupId);

                while(group.count != 0 && (timeout == -1 || performance.now() < timeout)) {
    	            var queue = selectNextQueue(DISPATCH.currentQueue);
     	            if(!queue) return;
    	            var task = queue.tasks.shift();
                    task.execute();
                }
            };
            DISPATCH.groupNotify = function(groupId, queueId, ctx, func) {
                var group = groupList.get(groupId);
                var queue = queueList.get(queueId);

                group.enter();
                var task = new Task(ctx, func);
                task.queue = queue;
                group.notifies.push(task);
                group.leave();
            };
            DISPATCH.groupEnter = function(groupId) {
                var group = groupList.get(groupId);
                group.enter();
            };
            DISPATCH.groupLeave = function(groupId) {
                var group = groupList.get(groupId);
                group.leave();
            };
            function selectNextQueue(exclude) {
                var list = queueList.list;
                for(var i = 0; i < list.length; i++) {
                    var queue = list[i];
                    if(queue == exclude) continue;
                    if(!queue.suspend && queue.tasks.length > 0) {
                        DISPATCH.currentQueue = queue;
                        return queue;
                    }
                }
                return null;
            }

            DISPATCH.handleQueue = function() {
                var begin = performance.now();

                // exec high priority tasks(event loop, display) prior to normal queue
                var specialEvents = Source.specialEvents;
                for(var i = 0; i < specialEvents.length; i++) {
                    var source = specialEvents[i];
                    if(source) {
                        var event = source.eventHandler;
                        if(event && !source.suspendCount) {
                            DISPATCH.currentQueue = source.queue;
                            event.execute();
                        }
                    }
                }

                // execute at least one task
                do {
      	            var queue = selectNextQueue(null);
      	            if(!queue) return;
      	            var task = queue.tasks.shift();
                    task.execute();
                } while(performance.now() - begin < 1000);

                DISPATCH.currentQueue = mainQueue;
            };
        },
        pointerToId: function(pointer) {
            // Id is stored at first in C struct
            return {{{ makeGetValue('pointer', 4, 'i32') }}};
        },
        nanoSec2MilliSec: function(low, high) {
            if(low < 0) low += 0x100000000;
            if(high < 0) high += 0x100000000;
            return (low/1000000 + (high * (0x100000000 /1000000)))|0;
        },
    },

    dispatch_async_f: function(queue, ctx, func) {
        DISPATCH.async(DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_sync_f: function(queue, ctx, func) {
        DISPATCH.sync(DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_apply_f: function(iter, queue, ctx, func) {
        DISPATCH.apply(iter, DISPATCH.pointerToId(queue), ctx, func);
    },
    _dispatch_get_current_queue_id: function() {
        return DISPATCH.currentQueue.id;
    },
    _dispatch_queue_create_internal: function(label) {
        return DISPATCH.queueCreate(label);
    },
    dispatch_queue_get_label: function() {
        return DISPATCH.getLabel(queue);
    },
    dispatch_set_target_queue: function(obj, queue) {
        DISPATCH.setTargetQueue(obj, DISPATCH.pointerToId(queue));
    },
    dispatch_after_f: function(when_low, when_high, queue, ctx, func) {
        DISPATCH.after(DISPATCH.nanoSec2MilliSec(when_low, when_high), DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_barrier_async_f: function(queue, ctx, func) {
        DISPATCH.async(DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_barrier_sync_f: function(queue, ctx, func) {
        DISPATCH.async(DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_queue_get_specific: function(queue, key) {
        return DISPATCH.getSpecific(DISPATCH.pointerToId(queue), key);
    },
    dispatch_queue_set_specific: function(queue, key, value, dtor) {
        return DISPATCH.setSpecific(DISPATCH.pointerToId(queue), key, value, dtor);
    },
    _dispatch_em_handle_queue: function() {
        DISPATCH.handleQueue();
    },
    _dispatch_source_create_internal: function(type, handle, mask, queue) {
        return DISPATCH.sourceCreate(type, handle, mask, DISPATCH.pointerToId(queue));
    },
    dispatch_source_set_timer: function(source, start_low, start_high, interval_low, interval_high, leeway_low, leeway_high) {
        DISPATCH.sourceSetTimer(DISPATCH.pointerToId(source),
                DISPATCH.nanoSec2MilliSec(start_low, start_high),
                DISPATCH.nanoSec2MilliSec(interval_low, interval_high),
                DISPATCH.nanoSec2MilliSec(leeway_low, leeway_high)
        );
    },
    _dispatch_source_set_event_handler_internal: function(source, ctx, func, dtor) {
        DISPATCH.sourceSetEventHandler(DISPATCH.pointerToId(source), ctx, func, dtor);
    },
    _dispatch_source_set_cancel_handler_internal: function(source, ctx, func, dtor) {
        DISPATCH.sourceSetCancelHandler(DISPATCH.pointerToId(source), ctx, func, dtor);
    },
    dispatch_source_cancel: function(source) {
        DISPATCH.sourceCancel(DISPATCH.pointerToId(source));
    },
    _dispatch_source_suspend: function(source) {
        DISPATCH.sourceSuspend(DISPATCH.pointerToId(source));
    },
    _dispatch_source_resume: function(source) {
        DISPATCH.sourceResume(DISPATCH.pointerToId(source));
    },
    _dispatch_group_create_internal: function() {
        return DISPATCH.groupCreate();
    },
    dispatch_group_async_f: function(group, queue, ctx, func) {
        DISPATCH.groupAsync(DISPATCH.pointerToId(group), DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_group_wait: function(group, timeout) {
        DISPATCH.groupWait(DISPATCH.pointerToId(group), timeout);
    },
    dispatch_group_notify_f: function(group, queue, ctx, func) {
        DISPATCH.groupNotify(DISPATCH.pointerToId(group), DISPATCH.pointerToId(queue), ctx, func);
    },
    dispatch_group_enter: function(group) {
        DISPATCH.groupEnter(DISPATCH.pointerToId(group));
    },
    dispatch_group_leave: function(group) {
        DISPATCH.groupLeave(DISPATCH.pointerToId(group));
    }
};

autoAddDeps(LibraryDispatch, '$DISPATCH');
mergeInto(LibraryManager.library, LibraryDispatch);
