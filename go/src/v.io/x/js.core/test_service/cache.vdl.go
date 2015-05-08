// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
// Source: cache.vdl

package test_service

import (
	// VDL system imports
	"io"
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/vdl"
)

// KeyPageResult is a page of 10 keys.
type KeyPageResult [10]string

func (KeyPageResult) __VDLReflect(struct {
	Name string `vdl:"v.io/x/js.core/test_service.KeyPageResult"`
}) {
}

// KeyValuePair is a representation of a cached key and value pair.
type KeyValuePair struct {
	Key   string
	Value *vdl.Value
}

func (KeyValuePair) __VDLReflect(struct {
	Name string `vdl:"v.io/x/js.core/test_service.KeyValuePair"`
}) {
}

func init() {
	vdl.Register((*KeyPageResult)(nil))
	vdl.Register((*KeyValuePair)(nil))
}

// CacheClientMethods is the client interface
// containing Cache methods.
//
// A Cache service mimics the memcache interface.
type CacheClientMethods interface {
	// Set sets a value for a key.
	Set(ctx *context.T, key string, value *vdl.Value, opts ...rpc.CallOpt) error
	// Get returns the value for a key.  If the value is not found, returns
	// a not found error.
	Get(ctx *context.T, key string, opts ...rpc.CallOpt) (*vdl.Value, error)
	// Same as Get, but casts the return argument to an byte.
	GetAsByte(ctx *context.T, key string, opts ...rpc.CallOpt) (byte, error)
	// Same as Get, but casts the return argument to an int32.
	GetAsInt32(ctx *context.T, key string, opts ...rpc.CallOpt) (int32, error)
	// Same as Get, but casts the return argument to an int64.
	GetAsInt64(ctx *context.T, key string, opts ...rpc.CallOpt) (int64, error)
	// Same as Get, but casts the return argument to an uint32.
	GetAsUint32(ctx *context.T, key string, opts ...rpc.CallOpt) (uint32, error)
	// Same as Get, but casts the return argument to an uint64.
	GetAsUint64(ctx *context.T, key string, opts ...rpc.CallOpt) (uint64, error)
	// Same as Get, but casts the return argument to an float32.
	GetAsFloat32(ctx *context.T, key string, opts ...rpc.CallOpt) (float32, error)
	// Same as Get, but casts the return argument to an float64.
	GetAsFloat64(ctx *context.T, key string, opts ...rpc.CallOpt) (float64, error)
	// Same as Get, but casts the return argument to a string.
	GetAsString(ctx *context.T, key string, opts ...rpc.CallOpt) (string, error)
	// Same as Get, but casts the return argument to a bool.
	GetAsBool(ctx *context.T, key string, opts ...rpc.CallOpt) (bool, error)
	// Same as Get, but casts the return argument to an error.
	GetAsError(ctx *context.T, key string, opts ...rpc.CallOpt) (error, error)
	// AsMap returns the full contents of the cache as a map.
	AsMap(*context.T, ...rpc.CallOpt) (map[string]*vdl.Value, error)
	// KeyValuePairs returns the full contents of the cache as a slice of pairs.
	KeyValuePairs(*context.T, ...rpc.CallOpt) ([]KeyValuePair, error)
	// MostRecentSet returns the key and value and the timestamp for the most
	// recent set operation
	// TODO(bprosnitz) support type types and change time to native time type
	MostRecentSet(*context.T, ...rpc.CallOpt) (value KeyValuePair, time int64, err error)
	// KeyPage indexes into the keys (in alphanumerically sorted order) and
	// returns the indexth page of 10 keys.
	KeyPage(ctx *context.T, index int64, opts ...rpc.CallOpt) (KeyPageResult, error)
	// Size returns the total number of entries in the cache.
	Size(*context.T, ...rpc.CallOpt) (int64, error)
	// MultiGet sets up a stream that allows fetching multiple keys.
	MultiGet(*context.T, ...rpc.CallOpt) (CacheMultiGetClientCall, error)
}

// CacheClientStub adds universal methods to CacheClientMethods.
type CacheClientStub interface {
	CacheClientMethods
	rpc.UniversalServiceMethods
}

// CacheClient returns a client stub for Cache.
func CacheClient(name string) CacheClientStub {
	return implCacheClientStub{name}
}

type implCacheClientStub struct {
	name string
}

func (c implCacheClientStub) Set(ctx *context.T, i0 string, i1 *vdl.Value, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "Set", []interface{}{i0, i1}, nil, opts...)
	return
}

func (c implCacheClientStub) Get(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 *vdl.Value, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "Get", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsByte(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 byte, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsByte", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsInt32(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 int32, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsInt32", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsInt64(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 int64, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsInt64", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsUint32(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 uint32, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsUint32", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsUint64(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 uint64, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsUint64", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsFloat32(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 float32, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsFloat32", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsFloat64(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 float64, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsFloat64", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsString(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 string, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsString", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsBool(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 bool, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsBool", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) GetAsError(ctx *context.T, i0 string, opts ...rpc.CallOpt) (o0 error, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "GetAsError", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) AsMap(ctx *context.T, opts ...rpc.CallOpt) (o0 map[string]*vdl.Value, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "AsMap", nil, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) KeyValuePairs(ctx *context.T, opts ...rpc.CallOpt) (o0 []KeyValuePair, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "KeyValuePairs", nil, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) MostRecentSet(ctx *context.T, opts ...rpc.CallOpt) (o0 KeyValuePair, o1 int64, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "MostRecentSet", nil, []interface{}{&o0, &o1}, opts...)
	return
}

func (c implCacheClientStub) KeyPage(ctx *context.T, i0 int64, opts ...rpc.CallOpt) (o0 KeyPageResult, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "KeyPage", []interface{}{i0}, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) Size(ctx *context.T, opts ...rpc.CallOpt) (o0 int64, err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "Size", nil, []interface{}{&o0}, opts...)
	return
}

func (c implCacheClientStub) MultiGet(ctx *context.T, opts ...rpc.CallOpt) (ocall CacheMultiGetClientCall, err error) {
	var call rpc.ClientCall
	if call, err = v23.GetClient(ctx).StartCall(ctx, c.name, "MultiGet", nil, opts...); err != nil {
		return
	}
	ocall = &implCacheMultiGetClientCall{ClientCall: call}
	return
}

// CacheMultiGetClientStream is the client stream for Cache.MultiGet.
type CacheMultiGetClientStream interface {
	// RecvStream returns the receiver side of the Cache.MultiGet client stream.
	RecvStream() interface {
		// Advance stages an item so that it may be retrieved via Value.  Returns
		// true iff there is an item to retrieve.  Advance must be called before
		// Value is called.  May block if an item is not available.
		Advance() bool
		// Value returns the item that was staged by Advance.  May panic if Advance
		// returned false or was not called.  Never blocks.
		Value() *vdl.Value
		// Err returns any error encountered by Advance.  Never blocks.
		Err() error
	}
	// SendStream returns the send side of the Cache.MultiGet client stream.
	SendStream() interface {
		// Send places the item onto the output stream.  Returns errors
		// encountered while sending, or if Send is called after Close or
		// the stream has been canceled.  Blocks if there is no buffer
		// space; will unblock when buffer space is available or after
		// the stream has been canceled.
		Send(item string) error
		// Close indicates to the server that no more items will be sent;
		// server Recv calls will receive io.EOF after all sent items.
		// This is an optional call - e.g. a client might call Close if it
		// needs to continue receiving items from the server after it's
		// done sending.  Returns errors encountered while closing, or if
		// Close is called after the stream has been canceled.  Like Send,
		// blocks if there is no buffer space available.
		Close() error
	}
}

// CacheMultiGetClientCall represents the call returned from Cache.MultiGet.
type CacheMultiGetClientCall interface {
	CacheMultiGetClientStream
	// Finish performs the equivalent of SendStream().Close, then blocks until
	// the server is done, and returns the positional return values for the call.
	//
	// Finish returns immediately if the call has been canceled; depending on the
	// timing the output could either be an error signaling cancelation, or the
	// valid positional return values from the server.
	//
	// Calling Finish is mandatory for releasing stream resources, unless the call
	// has been canceled or any of the other methods return an error.  Finish should
	// be called at most once.
	Finish() error
}

type implCacheMultiGetClientCall struct {
	rpc.ClientCall
	valRecv *vdl.Value
	errRecv error
}

func (c *implCacheMultiGetClientCall) RecvStream() interface {
	Advance() bool
	Value() *vdl.Value
	Err() error
} {
	return implCacheMultiGetClientCallRecv{c}
}

type implCacheMultiGetClientCallRecv struct {
	c *implCacheMultiGetClientCall
}

func (c implCacheMultiGetClientCallRecv) Advance() bool {
	c.c.valRecv = nil
	c.c.errRecv = c.c.Recv(&c.c.valRecv)
	return c.c.errRecv == nil
}
func (c implCacheMultiGetClientCallRecv) Value() *vdl.Value {
	return c.c.valRecv
}
func (c implCacheMultiGetClientCallRecv) Err() error {
	if c.c.errRecv == io.EOF {
		return nil
	}
	return c.c.errRecv
}
func (c *implCacheMultiGetClientCall) SendStream() interface {
	Send(item string) error
	Close() error
} {
	return implCacheMultiGetClientCallSend{c}
}

type implCacheMultiGetClientCallSend struct {
	c *implCacheMultiGetClientCall
}

func (c implCacheMultiGetClientCallSend) Send(item string) error {
	return c.c.Send(item)
}
func (c implCacheMultiGetClientCallSend) Close() error {
	return c.c.CloseSend()
}
func (c *implCacheMultiGetClientCall) Finish() (err error) {
	err = c.ClientCall.Finish()
	return
}

// CacheServerMethods is the interface a server writer
// implements for Cache.
//
// A Cache service mimics the memcache interface.
type CacheServerMethods interface {
	// Set sets a value for a key.
	Set(ctx *context.T, call rpc.ServerCall, key string, value *vdl.Value) error
	// Get returns the value for a key.  If the value is not found, returns
	// a not found error.
	Get(ctx *context.T, call rpc.ServerCall, key string) (*vdl.Value, error)
	// Same as Get, but casts the return argument to an byte.
	GetAsByte(ctx *context.T, call rpc.ServerCall, key string) (byte, error)
	// Same as Get, but casts the return argument to an int32.
	GetAsInt32(ctx *context.T, call rpc.ServerCall, key string) (int32, error)
	// Same as Get, but casts the return argument to an int64.
	GetAsInt64(ctx *context.T, call rpc.ServerCall, key string) (int64, error)
	// Same as Get, but casts the return argument to an uint32.
	GetAsUint32(ctx *context.T, call rpc.ServerCall, key string) (uint32, error)
	// Same as Get, but casts the return argument to an uint64.
	GetAsUint64(ctx *context.T, call rpc.ServerCall, key string) (uint64, error)
	// Same as Get, but casts the return argument to an float32.
	GetAsFloat32(ctx *context.T, call rpc.ServerCall, key string) (float32, error)
	// Same as Get, but casts the return argument to an float64.
	GetAsFloat64(ctx *context.T, call rpc.ServerCall, key string) (float64, error)
	// Same as Get, but casts the return argument to a string.
	GetAsString(ctx *context.T, call rpc.ServerCall, key string) (string, error)
	// Same as Get, but casts the return argument to a bool.
	GetAsBool(ctx *context.T, call rpc.ServerCall, key string) (bool, error)
	// Same as Get, but casts the return argument to an error.
	GetAsError(ctx *context.T, call rpc.ServerCall, key string) (error, error)
	// AsMap returns the full contents of the cache as a map.
	AsMap(*context.T, rpc.ServerCall) (map[string]*vdl.Value, error)
	// KeyValuePairs returns the full contents of the cache as a slice of pairs.
	KeyValuePairs(*context.T, rpc.ServerCall) ([]KeyValuePair, error)
	// MostRecentSet returns the key and value and the timestamp for the most
	// recent set operation
	// TODO(bprosnitz) support type types and change time to native time type
	MostRecentSet(*context.T, rpc.ServerCall) (value KeyValuePair, time int64, err error)
	// KeyPage indexes into the keys (in alphanumerically sorted order) and
	// returns the indexth page of 10 keys.
	KeyPage(ctx *context.T, call rpc.ServerCall, index int64) (KeyPageResult, error)
	// Size returns the total number of entries in the cache.
	Size(*context.T, rpc.ServerCall) (int64, error)
	// MultiGet sets up a stream that allows fetching multiple keys.
	MultiGet(*context.T, CacheMultiGetServerCall) error
}

// CacheServerStubMethods is the server interface containing
// Cache methods, as expected by rpc.Server.
// The only difference between this interface and CacheServerMethods
// is the streaming methods.
type CacheServerStubMethods interface {
	// Set sets a value for a key.
	Set(ctx *context.T, call rpc.ServerCall, key string, value *vdl.Value) error
	// Get returns the value for a key.  If the value is not found, returns
	// a not found error.
	Get(ctx *context.T, call rpc.ServerCall, key string) (*vdl.Value, error)
	// Same as Get, but casts the return argument to an byte.
	GetAsByte(ctx *context.T, call rpc.ServerCall, key string) (byte, error)
	// Same as Get, but casts the return argument to an int32.
	GetAsInt32(ctx *context.T, call rpc.ServerCall, key string) (int32, error)
	// Same as Get, but casts the return argument to an int64.
	GetAsInt64(ctx *context.T, call rpc.ServerCall, key string) (int64, error)
	// Same as Get, but casts the return argument to an uint32.
	GetAsUint32(ctx *context.T, call rpc.ServerCall, key string) (uint32, error)
	// Same as Get, but casts the return argument to an uint64.
	GetAsUint64(ctx *context.T, call rpc.ServerCall, key string) (uint64, error)
	// Same as Get, but casts the return argument to an float32.
	GetAsFloat32(ctx *context.T, call rpc.ServerCall, key string) (float32, error)
	// Same as Get, but casts the return argument to an float64.
	GetAsFloat64(ctx *context.T, call rpc.ServerCall, key string) (float64, error)
	// Same as Get, but casts the return argument to a string.
	GetAsString(ctx *context.T, call rpc.ServerCall, key string) (string, error)
	// Same as Get, but casts the return argument to a bool.
	GetAsBool(ctx *context.T, call rpc.ServerCall, key string) (bool, error)
	// Same as Get, but casts the return argument to an error.
	GetAsError(ctx *context.T, call rpc.ServerCall, key string) (error, error)
	// AsMap returns the full contents of the cache as a map.
	AsMap(*context.T, rpc.ServerCall) (map[string]*vdl.Value, error)
	// KeyValuePairs returns the full contents of the cache as a slice of pairs.
	KeyValuePairs(*context.T, rpc.ServerCall) ([]KeyValuePair, error)
	// MostRecentSet returns the key and value and the timestamp for the most
	// recent set operation
	// TODO(bprosnitz) support type types and change time to native time type
	MostRecentSet(*context.T, rpc.ServerCall) (value KeyValuePair, time int64, err error)
	// KeyPage indexes into the keys (in alphanumerically sorted order) and
	// returns the indexth page of 10 keys.
	KeyPage(ctx *context.T, call rpc.ServerCall, index int64) (KeyPageResult, error)
	// Size returns the total number of entries in the cache.
	Size(*context.T, rpc.ServerCall) (int64, error)
	// MultiGet sets up a stream that allows fetching multiple keys.
	MultiGet(*context.T, *CacheMultiGetServerCallStub) error
}

// CacheServerStub adds universal methods to CacheServerStubMethods.
type CacheServerStub interface {
	CacheServerStubMethods
	// Describe the Cache interfaces.
	Describe__() []rpc.InterfaceDesc
}

// CacheServer returns a server stub for Cache.
// It converts an implementation of CacheServerMethods into
// an object that may be used by rpc.Server.
func CacheServer(impl CacheServerMethods) CacheServerStub {
	stub := implCacheServerStub{
		impl: impl,
	}
	// Initialize GlobState; always check the stub itself first, to handle the
	// case where the user has the Glob method defined in their VDL source.
	if gs := rpc.NewGlobState(stub); gs != nil {
		stub.gs = gs
	} else if gs := rpc.NewGlobState(impl); gs != nil {
		stub.gs = gs
	}
	return stub
}

type implCacheServerStub struct {
	impl CacheServerMethods
	gs   *rpc.GlobState
}

func (s implCacheServerStub) Set(ctx *context.T, call rpc.ServerCall, i0 string, i1 *vdl.Value) error {
	return s.impl.Set(ctx, call, i0, i1)
}

func (s implCacheServerStub) Get(ctx *context.T, call rpc.ServerCall, i0 string) (*vdl.Value, error) {
	return s.impl.Get(ctx, call, i0)
}

func (s implCacheServerStub) GetAsByte(ctx *context.T, call rpc.ServerCall, i0 string) (byte, error) {
	return s.impl.GetAsByte(ctx, call, i0)
}

func (s implCacheServerStub) GetAsInt32(ctx *context.T, call rpc.ServerCall, i0 string) (int32, error) {
	return s.impl.GetAsInt32(ctx, call, i0)
}

func (s implCacheServerStub) GetAsInt64(ctx *context.T, call rpc.ServerCall, i0 string) (int64, error) {
	return s.impl.GetAsInt64(ctx, call, i0)
}

func (s implCacheServerStub) GetAsUint32(ctx *context.T, call rpc.ServerCall, i0 string) (uint32, error) {
	return s.impl.GetAsUint32(ctx, call, i0)
}

func (s implCacheServerStub) GetAsUint64(ctx *context.T, call rpc.ServerCall, i0 string) (uint64, error) {
	return s.impl.GetAsUint64(ctx, call, i0)
}

func (s implCacheServerStub) GetAsFloat32(ctx *context.T, call rpc.ServerCall, i0 string) (float32, error) {
	return s.impl.GetAsFloat32(ctx, call, i0)
}

func (s implCacheServerStub) GetAsFloat64(ctx *context.T, call rpc.ServerCall, i0 string) (float64, error) {
	return s.impl.GetAsFloat64(ctx, call, i0)
}

func (s implCacheServerStub) GetAsString(ctx *context.T, call rpc.ServerCall, i0 string) (string, error) {
	return s.impl.GetAsString(ctx, call, i0)
}

func (s implCacheServerStub) GetAsBool(ctx *context.T, call rpc.ServerCall, i0 string) (bool, error) {
	return s.impl.GetAsBool(ctx, call, i0)
}

func (s implCacheServerStub) GetAsError(ctx *context.T, call rpc.ServerCall, i0 string) (error, error) {
	return s.impl.GetAsError(ctx, call, i0)
}

func (s implCacheServerStub) AsMap(ctx *context.T, call rpc.ServerCall) (map[string]*vdl.Value, error) {
	return s.impl.AsMap(ctx, call)
}

func (s implCacheServerStub) KeyValuePairs(ctx *context.T, call rpc.ServerCall) ([]KeyValuePair, error) {
	return s.impl.KeyValuePairs(ctx, call)
}

func (s implCacheServerStub) MostRecentSet(ctx *context.T, call rpc.ServerCall) (KeyValuePair, int64, error) {
	return s.impl.MostRecentSet(ctx, call)
}

func (s implCacheServerStub) KeyPage(ctx *context.T, call rpc.ServerCall, i0 int64) (KeyPageResult, error) {
	return s.impl.KeyPage(ctx, call, i0)
}

func (s implCacheServerStub) Size(ctx *context.T, call rpc.ServerCall) (int64, error) {
	return s.impl.Size(ctx, call)
}

func (s implCacheServerStub) MultiGet(ctx *context.T, call *CacheMultiGetServerCallStub) error {
	return s.impl.MultiGet(ctx, call)
}

func (s implCacheServerStub) Globber() *rpc.GlobState {
	return s.gs
}

func (s implCacheServerStub) Describe__() []rpc.InterfaceDesc {
	return []rpc.InterfaceDesc{CacheDesc}
}

// CacheDesc describes the Cache interface.
var CacheDesc rpc.InterfaceDesc = descCache

// descCache hides the desc to keep godoc clean.
var descCache = rpc.InterfaceDesc{
	Name:    "Cache",
	PkgPath: "v.io/x/js.core/test_service",
	Doc:     "// A Cache service mimics the memcache interface.",
	Methods: []rpc.MethodDesc{
		{
			Name: "Set",
			Doc:  "// Set sets a value for a key.",
			InArgs: []rpc.ArgDesc{
				{"key", ``},   // string
				{"value", ``}, // *vdl.Value
			},
		},
		{
			Name: "Get",
			Doc:  "// Get returns the value for a key.  If the value is not found, returns\n// a not found error.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // *vdl.Value
			},
		},
		{
			Name: "GetAsByte",
			Doc:  "// Same as Get, but casts the return argument to an byte.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // byte
			},
		},
		{
			Name: "GetAsInt32",
			Doc:  "// Same as Get, but casts the return argument to an int32.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // int32
			},
		},
		{
			Name: "GetAsInt64",
			Doc:  "// Same as Get, but casts the return argument to an int64.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // int64
			},
		},
		{
			Name: "GetAsUint32",
			Doc:  "// Same as Get, but casts the return argument to an uint32.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // uint32
			},
		},
		{
			Name: "GetAsUint64",
			Doc:  "// Same as Get, but casts the return argument to an uint64.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // uint64
			},
		},
		{
			Name: "GetAsFloat32",
			Doc:  "// Same as Get, but casts the return argument to an float32.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // float32
			},
		},
		{
			Name: "GetAsFloat64",
			Doc:  "// Same as Get, but casts the return argument to an float64.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // float64
			},
		},
		{
			Name: "GetAsString",
			Doc:  "// Same as Get, but casts the return argument to a string.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // string
			},
		},
		{
			Name: "GetAsBool",
			Doc:  "// Same as Get, but casts the return argument to a bool.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // bool
			},
		},
		{
			Name: "GetAsError",
			Doc:  "// Same as Get, but casts the return argument to an error.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // error
			},
		},
		{
			Name: "AsMap",
			Doc:  "// AsMap returns the full contents of the cache as a map.",
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // map[string]*vdl.Value
			},
		},
		{
			Name: "KeyValuePairs",
			Doc:  "// KeyValuePairs returns the full contents of the cache as a slice of pairs.",
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // []KeyValuePair
			},
		},
		{
			Name: "MostRecentSet",
			Doc:  "// MostRecentSet returns the key and value and the timestamp for the most\n// recent set operation\n// TODO(bprosnitz) support type types and change time to native time type",
			OutArgs: []rpc.ArgDesc{
				{"value", ``}, // KeyValuePair
				{"time", ``},  // int64
			},
		},
		{
			Name: "KeyPage",
			Doc:  "// KeyPage indexes into the keys (in alphanumerically sorted order) and\n// returns the indexth page of 10 keys.",
			InArgs: []rpc.ArgDesc{
				{"index", ``}, // int64
			},
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // KeyPageResult
			},
		},
		{
			Name: "Size",
			Doc:  "// Size returns the total number of entries in the cache.",
			OutArgs: []rpc.ArgDesc{
				{"", ``}, // int64
			},
		},
		{
			Name: "MultiGet",
			Doc:  "// MultiGet sets up a stream that allows fetching multiple keys.",
		},
	},
}

// CacheMultiGetServerStream is the server stream for Cache.MultiGet.
type CacheMultiGetServerStream interface {
	// RecvStream returns the receiver side of the Cache.MultiGet server stream.
	RecvStream() interface {
		// Advance stages an item so that it may be retrieved via Value.  Returns
		// true iff there is an item to retrieve.  Advance must be called before
		// Value is called.  May block if an item is not available.
		Advance() bool
		// Value returns the item that was staged by Advance.  May panic if Advance
		// returned false or was not called.  Never blocks.
		Value() string
		// Err returns any error encountered by Advance.  Never blocks.
		Err() error
	}
	// SendStream returns the send side of the Cache.MultiGet server stream.
	SendStream() interface {
		// Send places the item onto the output stream.  Returns errors encountered
		// while sending.  Blocks if there is no buffer space; will unblock when
		// buffer space is available.
		Send(item *vdl.Value) error
	}
}

// CacheMultiGetServerCall represents the context passed to Cache.MultiGet.
type CacheMultiGetServerCall interface {
	rpc.ServerCall
	CacheMultiGetServerStream
}

// CacheMultiGetServerCallStub is a wrapper that converts rpc.StreamServerCall into
// a typesafe stub that implements CacheMultiGetServerCall.
type CacheMultiGetServerCallStub struct {
	rpc.StreamServerCall
	valRecv string
	errRecv error
}

// Init initializes CacheMultiGetServerCallStub from rpc.StreamServerCall.
func (s *CacheMultiGetServerCallStub) Init(call rpc.StreamServerCall) {
	s.StreamServerCall = call
}

// RecvStream returns the receiver side of the Cache.MultiGet server stream.
func (s *CacheMultiGetServerCallStub) RecvStream() interface {
	Advance() bool
	Value() string
	Err() error
} {
	return implCacheMultiGetServerCallRecv{s}
}

type implCacheMultiGetServerCallRecv struct {
	s *CacheMultiGetServerCallStub
}

func (s implCacheMultiGetServerCallRecv) Advance() bool {
	s.s.errRecv = s.s.Recv(&s.s.valRecv)
	return s.s.errRecv == nil
}
func (s implCacheMultiGetServerCallRecv) Value() string {
	return s.s.valRecv
}
func (s implCacheMultiGetServerCallRecv) Err() error {
	if s.s.errRecv == io.EOF {
		return nil
	}
	return s.s.errRecv
}

// SendStream returns the send side of the Cache.MultiGet server stream.
func (s *CacheMultiGetServerCallStub) SendStream() interface {
	Send(item *vdl.Value) error
} {
	return implCacheMultiGetServerCallSend{s}
}

type implCacheMultiGetServerCallSend struct {
	s *CacheMultiGetServerCallStub
}

func (s implCacheMultiGetServerCallSend) Send(item *vdl.Value) error {
	return s.s.Send(item)
}
