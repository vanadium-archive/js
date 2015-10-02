// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"reflect"
	"sort"
	"sync"
	"time"

	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/vdl"
	"v.io/v23/verror"
	"v.io/x/js.core/test_service"
)

const pkgPath = "release/javascript/core/test_service/test_serviced"

var errIndexOutOfBounds = verror.Register(pkgPath+".errIndexOutOfBounds", verror.NoRetry, "{1:}{2:} Page index out of bounds{:_}")

// A simple in-memory implementation of a Cache service.
type cacheImpl struct {
	mu             sync.Mutex
	cache          map[string]*vdl.Value
	mostRecent     test_service.KeyValuePair
	lastUpdateTime time.Time
}

// NewCached returns a new implementation of CacheServerMethods.
func NewCached() test_service.CacheServerMethods {
	return &cacheImpl{cache: make(map[string]*vdl.Value)}
}

// Set sets a value for a key.  This should never return an error.
func (c *cacheImpl) Set(ctx *context.T, _ rpc.ServerCall, key string, value *vdl.Value) error {
	c.mu.Lock()
	ctx.VI(0).Info("Set called with %v", key)
	c.cache[key] = value
	c.mostRecent = test_service.KeyValuePair{Key: key, Value: value}
	c.lastUpdateTime = time.Now()
	c.mu.Unlock()
	return nil
}

// Get returns the value for a key.  If the key is not in the map, it returns
// an error.
func (c *cacheImpl) Get(ctx *context.T, _ rpc.ServerCall, key string) (*vdl.Value, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if value, ok := c.cache[key]; ok {
		return value, nil
	}
	return nil, verror.New(verror.ErrNoExist, ctx, key)
}

// getWithTypeCheck gets the key and tests if its type matches the given time, erroring if it does
// not.
// This exists mostly to shorted the Get* methods below.
func (c *cacheImpl) getWithTypeCheck(key string, rt reflect.Type) (interface{}, error) {
	v, err := c.Get(nil, nil, key)
	if err != nil {
		return reflect.Zero(rt).Interface(), err
	}
	if !reflect.TypeOf(v).AssignableTo(rt) {
		return reflect.Zero(rt).Interface(),
			fmt.Errorf("Cannot convert %v (type %v) to type %v", v, reflect.TypeOf(v), rt)
	}
	return v, nil
}

// Same as Get, but casts the return argument to an int32.
func (c *cacheImpl) GetAsInt32(_ *context.T, _ rpc.ServerCall, key string) (int32, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(int32(0)))
	return v.(int32), err
}

// Same as Get, but casts the return argument to an int64.
func (c *cacheImpl) GetAsInt64(_ *context.T, _ rpc.ServerCall, key string) (int64, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(int64(0)))
	return v.(int64), err
}

// Same as Get, but casts the return argument to an uint8.
func (c *cacheImpl) GetAsByte(_ *context.T, _ rpc.ServerCall, key string) (byte, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(byte(0)))
	return v.(uint8), err
}

// Same as Get, but casts the return argument to an uint32.
func (c *cacheImpl) GetAsUint32(_ *context.T, _ rpc.ServerCall, key string) (uint32, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(uint32(0)))
	return v.(uint32), err
}

// Same as Get, but casts the return argument to an uint64.
func (c *cacheImpl) GetAsUint64(_ *context.T, _ rpc.ServerCall, key string) (uint64, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(uint64(0)))
	return v.(uint64), err
}

// Same as Get, but casts the return argument to a float32.
func (c *cacheImpl) GetAsFloat32(_ *context.T, _ rpc.ServerCall, key string) (float32, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(float32(0)))
	return v.(float32), err
}

// Same as Get, but casts the return argument to a float64.
func (c *cacheImpl) GetAsFloat64(_ *context.T, _ rpc.ServerCall, key string) (float64, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(float64(0)))
	return v.(float64), err
}

// Same as Get, but casts the return argument to a string.
func (c *cacheImpl) GetAsString(_ *context.T, _ rpc.ServerCall, key string) (string, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(""))
	return v.(string), err
}

// Same as Get, but casts the return argument to a bool.
func (c *cacheImpl) GetAsBool(_ *context.T, _ rpc.ServerCall, key string) (bool, error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf(false))
	return v.(bool), err
}

// Same as Get, but converts the string return argument to an error.
func (c *cacheImpl) GetAsError(_ *context.T, _ rpc.ServerCall, key string) (storedError error, callError error) {
	v, err := c.getWithTypeCheck(key, reflect.TypeOf([]error{}).Elem())
	return v.(error), err
}

// AsMap returns the full contents of the cache as a map.
func (c *cacheImpl) AsMap(*context.T, rpc.ServerCall) (map[string]*vdl.Value, error) {
	return c.cache, nil
}

// KeyValuePairs returns the full contents of the cache as a slice of pairs.
func (c *cacheImpl) KeyValuePairs(*context.T, rpc.ServerCall) ([]test_service.KeyValuePair, error) {
	c.mu.Lock()
	kvp := make([]test_service.KeyValuePair, 0, len(c.cache))
	for key, val := range c.cache {
		kvp = append(kvp, test_service.KeyValuePair{key, val})
	}
	c.mu.Unlock()
	return kvp, nil
}

// MostRecentSet returns the key and value and the timestamp for the most
// recent set operation
// TODO(bprosnitz) support type types and change time to native time type
func (c *cacheImpl) MostRecentSet(ctx *context.T, _ rpc.ServerCall) (test_service.KeyValuePair, int64, error) {
	var err error
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.lastUpdateTime.IsZero() {
		err = verror.New(verror.ErrNoExist, ctx)
	}
	return c.mostRecent, c.lastUpdateTime.Unix(), err
}

// KeyPage indexes into the keys (in alphanumerically sorted order) and
// returns the indexth page of 10 keys.
func (c *cacheImpl) KeyPage(ctx *context.T, _ rpc.ServerCall, index int64) (test_service.KeyPageResult, error) {
	results := test_service.KeyPageResult{}

	c.mu.Lock()
	keys := sort.StringSlice{}
	for key, _ := range c.cache {
		keys = append(keys, key)
	}
	c.mu.Unlock()
	keys.Sort()

	lowIndex := int(index) * 10
	if index < 0 || len(keys) <= lowIndex {
		return results, verror.New(errIndexOutOfBounds, ctx, index)
	}
	highIndex := lowIndex + 9
	if highIndex > len(keys)-1 {
		highIndex = len(keys) - 1
	}

	for i := 0; lowIndex+i <= highIndex; i++ {
		results[i] = keys[lowIndex+i]
	}

	return results, nil
}

// Size returns the total number of entries in the cache.
func (c *cacheImpl) Size(*context.T, rpc.ServerCall) (int64, error) {
	return int64(len(c.cache)), nil
}

// MultiGet handles a stream of get requests.  Returns an error if one of the
// keys in the stream is not in the map or if there was an issue reading
// the stream.
func (c *cacheImpl) MultiGet(ctx *context.T, call test_service.CacheMultiGetServerCall) error {
	for call.RecvStream().Advance() {
		key := call.RecvStream().Value()
		c.mu.Lock()
		value, ok := c.cache[key]
		c.mu.Unlock()
		if !ok {
			return verror.New(verror.ErrNoExist, ctx, key)
		}
		call.SendStream().Send(value)
	}
	return call.RecvStream().Err()
}
