// This file was auto-generated by the vanadium vdl tool.
// Source: cancel_collector.vdl

package test_service

import (
	// VDL system imports
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
)

// CancelCollectorClientMethods is the client interface
// containing CancelCollector methods.
//
// CancelCollector is a test interface for use in testing cancellation and deadlines.
type CancelCollectorClientMethods interface {
	// A function that never returns, but records the status of the given key.
	NeverReturn(ctx *context.T, key int64, opts ...rpc.CallOpt) error
	// Wait for the call with the given key to have the given status.  Possible statuses are:
	// "running", and, "cancelled".  Returns the number of nanoseconds left on
	// the deadline of the specified call when the call first began.
	WaitForStatus(ctx *context.T, key int64, status string, opts ...rpc.CallOpt) (timeout int64, err error)
}

// CancelCollectorClientStub adds universal methods to CancelCollectorClientMethods.
type CancelCollectorClientStub interface {
	CancelCollectorClientMethods
	rpc.UniversalServiceMethods
}

// CancelCollectorClient returns a client stub for CancelCollector.
func CancelCollectorClient(name string, opts ...rpc.BindOpt) CancelCollectorClientStub {
	var client rpc.Client
	for _, opt := range opts {
		if clientOpt, ok := opt.(rpc.Client); ok {
			client = clientOpt
		}
	}
	return implCancelCollectorClientStub{name, client}
}

type implCancelCollectorClientStub struct {
	name   string
	client rpc.Client
}

func (c implCancelCollectorClientStub) c(ctx *context.T) rpc.Client {
	if c.client != nil {
		return c.client
	}
	return v23.GetClient(ctx)
}

func (c implCancelCollectorClientStub) NeverReturn(ctx *context.T, i0 int64, opts ...rpc.CallOpt) (err error) {
	var call rpc.ClientCall
	if call, err = c.c(ctx).StartCall(ctx, c.name, "NeverReturn", []interface{}{i0}, opts...); err != nil {
		return
	}
	err = call.Finish()
	return
}

func (c implCancelCollectorClientStub) WaitForStatus(ctx *context.T, i0 int64, i1 string, opts ...rpc.CallOpt) (o0 int64, err error) {
	var call rpc.ClientCall
	if call, err = c.c(ctx).StartCall(ctx, c.name, "WaitForStatus", []interface{}{i0, i1}, opts...); err != nil {
		return
	}
	err = call.Finish(&o0)
	return
}

// CancelCollectorServerMethods is the interface a server writer
// implements for CancelCollector.
//
// CancelCollector is a test interface for use in testing cancellation and deadlines.
type CancelCollectorServerMethods interface {
	// A function that never returns, but records the status of the given key.
	NeverReturn(call rpc.ServerCall, key int64) error
	// Wait for the call with the given key to have the given status.  Possible statuses are:
	// "running", and, "cancelled".  Returns the number of nanoseconds left on
	// the deadline of the specified call when the call first began.
	WaitForStatus(call rpc.ServerCall, key int64, status string) (timeout int64, err error)
}

// CancelCollectorServerStubMethods is the server interface containing
// CancelCollector methods, as expected by rpc.Server.
// There is no difference between this interface and CancelCollectorServerMethods
// since there are no streaming methods.
type CancelCollectorServerStubMethods CancelCollectorServerMethods

// CancelCollectorServerStub adds universal methods to CancelCollectorServerStubMethods.
type CancelCollectorServerStub interface {
	CancelCollectorServerStubMethods
	// Describe the CancelCollector interfaces.
	Describe__() []rpc.InterfaceDesc
}

// CancelCollectorServer returns a server stub for CancelCollector.
// It converts an implementation of CancelCollectorServerMethods into
// an object that may be used by rpc.Server.
func CancelCollectorServer(impl CancelCollectorServerMethods) CancelCollectorServerStub {
	stub := implCancelCollectorServerStub{
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

type implCancelCollectorServerStub struct {
	impl CancelCollectorServerMethods
	gs   *rpc.GlobState
}

func (s implCancelCollectorServerStub) NeverReturn(call rpc.ServerCall, i0 int64) error {
	return s.impl.NeverReturn(call, i0)
}

func (s implCancelCollectorServerStub) WaitForStatus(call rpc.ServerCall, i0 int64, i1 string) (int64, error) {
	return s.impl.WaitForStatus(call, i0, i1)
}

func (s implCancelCollectorServerStub) Globber() *rpc.GlobState {
	return s.gs
}

func (s implCancelCollectorServerStub) Describe__() []rpc.InterfaceDesc {
	return []rpc.InterfaceDesc{CancelCollectorDesc}
}

// CancelCollectorDesc describes the CancelCollector interface.
var CancelCollectorDesc rpc.InterfaceDesc = descCancelCollector

// descCancelCollector hides the desc to keep godoc clean.
var descCancelCollector = rpc.InterfaceDesc{
	Name:    "CancelCollector",
	PkgPath: "test_service",
	Doc:     "// CancelCollector is a test interface for use in testing cancellation and deadlines.",
	Methods: []rpc.MethodDesc{
		{
			Name: "NeverReturn",
			Doc:  "// A function that never returns, but records the status of the given key.",
			InArgs: []rpc.ArgDesc{
				{"key", ``}, // int64
			},
		},
		{
			Name: "WaitForStatus",
			Doc:  "// Wait for the call with the given key to have the given status.  Possible statuses are:\n// \"running\", and, \"cancelled\".  Returns the number of nanoseconds left on\n// the deadline of the specified call when the call first began.",
			InArgs: []rpc.ArgDesc{
				{"key", ``},    // int64
				{"status", ``}, // string
			},
			OutArgs: []rpc.ArgDesc{
				{"timeout", ``}, // int64
			},
		},
	},
}
