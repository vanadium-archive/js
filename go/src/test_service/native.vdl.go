// This file was auto-generated by the veyron vdl tool.
// Source: native.vdl

package test_service

import (
	// VDL system imports
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/ipc"

	// VDL user imports
	"time"
	_ "v.io/v23/vdlroot/time"
)

// NativeTestClientMethods is the client interface
// containing NativeTest methods.
type NativeTestClientMethods interface {
	PassTime(ctx *context.T, t time.Time, opts ...ipc.CallOpt) (time.Time, error)
	PassError(ctx *context.T, e error, opts ...ipc.CallOpt) error
}

// NativeTestClientStub adds universal methods to NativeTestClientMethods.
type NativeTestClientStub interface {
	NativeTestClientMethods
	ipc.UniversalServiceMethods
}

// NativeTestClient returns a client stub for NativeTest.
func NativeTestClient(name string, opts ...ipc.BindOpt) NativeTestClientStub {
	var client ipc.Client
	for _, opt := range opts {
		if clientOpt, ok := opt.(ipc.Client); ok {
			client = clientOpt
		}
	}
	return implNativeTestClientStub{name, client}
}

type implNativeTestClientStub struct {
	name   string
	client ipc.Client
}

func (c implNativeTestClientStub) c(ctx *context.T) ipc.Client {
	if c.client != nil {
		return c.client
	}
	return v23.GetClient(ctx)
}

func (c implNativeTestClientStub) PassTime(ctx *context.T, i0 time.Time, opts ...ipc.CallOpt) (o0 time.Time, err error) {
	var call ipc.ClientCall
	if call, err = c.c(ctx).StartCall(ctx, c.name, "PassTime", []interface{}{i0}, opts...); err != nil {
		return
	}
	err = call.Finish(&o0)
	return
}

func (c implNativeTestClientStub) PassError(ctx *context.T, i0 error, opts ...ipc.CallOpt) (err error) {
	var call ipc.ClientCall
	if call, err = c.c(ctx).StartCall(ctx, c.name, "PassError", []interface{}{&i0}, opts...); err != nil {
		return
	}
	err = call.Finish()
	return
}

// NativeTestServerMethods is the interface a server writer
// implements for NativeTest.
type NativeTestServerMethods interface {
	PassTime(ctx ipc.ServerCall, t time.Time) (time.Time, error)
	PassError(ctx ipc.ServerCall, e error) error
}

// NativeTestServerStubMethods is the server interface containing
// NativeTest methods, as expected by ipc.Server.
// There is no difference between this interface and NativeTestServerMethods
// since there are no streaming methods.
type NativeTestServerStubMethods NativeTestServerMethods

// NativeTestServerStub adds universal methods to NativeTestServerStubMethods.
type NativeTestServerStub interface {
	NativeTestServerStubMethods
	// Describe the NativeTest interfaces.
	Describe__() []ipc.InterfaceDesc
}

// NativeTestServer returns a server stub for NativeTest.
// It converts an implementation of NativeTestServerMethods into
// an object that may be used by ipc.Server.
func NativeTestServer(impl NativeTestServerMethods) NativeTestServerStub {
	stub := implNativeTestServerStub{
		impl: impl,
	}
	// Initialize GlobState; always check the stub itself first, to handle the
	// case where the user has the Glob method defined in their VDL source.
	if gs := ipc.NewGlobState(stub); gs != nil {
		stub.gs = gs
	} else if gs := ipc.NewGlobState(impl); gs != nil {
		stub.gs = gs
	}
	return stub
}

type implNativeTestServerStub struct {
	impl NativeTestServerMethods
	gs   *ipc.GlobState
}

func (s implNativeTestServerStub) PassTime(ctx ipc.ServerCall, i0 time.Time) (time.Time, error) {
	return s.impl.PassTime(ctx, i0)
}

func (s implNativeTestServerStub) PassError(ctx ipc.ServerCall, i0 error) error {
	return s.impl.PassError(ctx, i0)
}

func (s implNativeTestServerStub) Globber() *ipc.GlobState {
	return s.gs
}

func (s implNativeTestServerStub) Describe__() []ipc.InterfaceDesc {
	return []ipc.InterfaceDesc{NativeTestDesc}
}

// NativeTestDesc describes the NativeTest interface.
var NativeTestDesc ipc.InterfaceDesc = descNativeTest

// descNativeTest hides the desc to keep godoc clean.
var descNativeTest = ipc.InterfaceDesc{
	Name:    "NativeTest",
	PkgPath: "test_service",
	Methods: []ipc.MethodDesc{
		{
			Name: "PassTime",
			InArgs: []ipc.ArgDesc{
				{"t", ``}, // time.Time
			},
			OutArgs: []ipc.ArgDesc{
				{"", ``}, // time.Time
			},
		},
		{
			Name: "PassError",
			InArgs: []ipc.ArgDesc{
				{"e", ``}, // error
			},
		},
	},
}
