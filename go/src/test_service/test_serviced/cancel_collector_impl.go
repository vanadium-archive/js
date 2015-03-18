package main

import (
	"sync"
	"time"

	"v.io/v23/rpc"

	"test_service"
)

type callStatus int

const (
	unknown = callStatus(iota)
	running
	cancelled
)

func statusFromString(s string) callStatus {
	switch s {
	case "running":
		return running
	case "cancelled":
		return cancelled
	default:
		return unknown
	}
}

// NewCancelCollector returns a new implementation of CancelCollectorServerMethods.
func NewCancelCollector() test_service.CancelCollectorServerMethods {
	return &cancelCollectorImpl{
		infoMap: make(map[int64]*callInfo),
	}
}

type callInfo struct {
	status  callStatus
	timeout int64
	cond    *sync.Cond
}

type cancelCollectorImpl struct {
	mu      sync.Mutex
	infoMap map[int64]*callInfo
}

func (c *cancelCollectorImpl) setStatus(key int64, status callStatus) {
	c.mu.Lock()
	defer c.mu.Unlock()

	info := c.infoMap[key]
	if info.status < status {
		info.status = status
		info.cond.Broadcast()
	}
}

func (c *cancelCollectorImpl) getInfoLocked(key int64) *callInfo {
	info, ok := c.infoMap[key]
	if !ok {
		info = &callInfo{
			cond: sync.NewCond(&c.mu),
		}
		c.infoMap[key] = info
	}
	return info
}

func (c *cancelCollectorImpl) NeverReturn(call rpc.ServerCall, key int64) error {
	timeout := int64(0x7FFFFFFFFFFFFFFF / 1000000)
	if deadline, ok := call.Context().Deadline(); ok {
		timeout = int64(deadline.Sub(time.Now())) / 1000000
	}

	c.mu.Lock()
	info := c.getInfoLocked(key)
	info.timeout = timeout
	c.mu.Unlock()

	c.setStatus(key, running)
	<-call.Context().Done()
	c.setStatus(key, cancelled)
	return nil
}

func (c *cancelCollectorImpl) WaitForStatus(call rpc.ServerCall, key int64, statusStr string) (int64, error) {
	status := statusFromString(statusStr)

	c.mu.Lock()
	defer c.mu.Unlock()

	info := c.getInfoLocked(key)
	for status > info.status {
		info.cond.Wait()
	}
	return info.timeout, nil
}
