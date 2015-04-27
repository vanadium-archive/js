// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
// Source: error_thrower.vdl

package test_service

import (
	// VDL system imports
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
)

// ErrorThrowerClientMethods is the client interface
// containing ErrorThrower methods.
//
// A testing interface with methods that throw various types of errors
type ErrorThrowerClientMethods interface {
	// Throws v23/vError.Aborted error
	ThrowAborted(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.BadArg error
	ThrowBadArg(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.BadProtocol error
	ThrowBadProtocol(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.Internal error
	ThrowInternal(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.NoAccess error
	ThrowNoAccess(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.NoExist error
	ThrowNoExist(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.NoExistOrNoAccess error
	ThrowNoExistOrNoAccess(*context.T, ...rpc.CallOpt) error
	// Throws v23/vError.Unknown error
	ThrowUnknown(*context.T, ...rpc.CallOpt) error
	// Throws normal Go error
	ThrowGoError(*context.T, ...rpc.CallOpt) error
	// Throws custom error created by using Standard
	ThrowCustomStandardError(*context.T, ...rpc.CallOpt) error
}

// ErrorThrowerClientStub adds universal methods to ErrorThrowerClientMethods.
type ErrorThrowerClientStub interface {
	ErrorThrowerClientMethods
	rpc.UniversalServiceMethods
}

// ErrorThrowerClient returns a client stub for ErrorThrower.
func ErrorThrowerClient(name string) ErrorThrowerClientStub {
	return implErrorThrowerClientStub{name}
}

type implErrorThrowerClientStub struct {
	name string
}

func (c implErrorThrowerClientStub) ThrowAborted(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowAborted", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowBadArg(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowBadArg", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowBadProtocol(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowBadProtocol", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowInternal(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowInternal", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowNoAccess(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowNoAccess", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowNoExist(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowNoExist", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowNoExistOrNoAccess(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowNoExistOrNoAccess", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowUnknown(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowUnknown", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowGoError(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowGoError", nil, nil, opts...)
	return
}

func (c implErrorThrowerClientStub) ThrowCustomStandardError(ctx *context.T, opts ...rpc.CallOpt) (err error) {
	err = v23.GetClient(ctx).Call(ctx, c.name, "ThrowCustomStandardError", nil, nil, opts...)
	return
}

// ErrorThrowerServerMethods is the interface a server writer
// implements for ErrorThrower.
//
// A testing interface with methods that throw various types of errors
type ErrorThrowerServerMethods interface {
	// Throws v23/vError.Aborted error
	ThrowAborted(*context.T, rpc.ServerCall) error
	// Throws v23/vError.BadArg error
	ThrowBadArg(*context.T, rpc.ServerCall) error
	// Throws v23/vError.BadProtocol error
	ThrowBadProtocol(*context.T, rpc.ServerCall) error
	// Throws v23/vError.Internal error
	ThrowInternal(*context.T, rpc.ServerCall) error
	// Throws v23/vError.NoAccess error
	ThrowNoAccess(*context.T, rpc.ServerCall) error
	// Throws v23/vError.NoExist error
	ThrowNoExist(*context.T, rpc.ServerCall) error
	// Throws v23/vError.NoExistOrNoAccess error
	ThrowNoExistOrNoAccess(*context.T, rpc.ServerCall) error
	// Throws v23/vError.Unknown error
	ThrowUnknown(*context.T, rpc.ServerCall) error
	// Throws normal Go error
	ThrowGoError(*context.T, rpc.ServerCall) error
	// Throws custom error created by using Standard
	ThrowCustomStandardError(*context.T, rpc.ServerCall) error
}

// ErrorThrowerServerStubMethods is the server interface containing
// ErrorThrower methods, as expected by rpc.Server.
// There is no difference between this interface and ErrorThrowerServerMethods
// since there are no streaming methods.
type ErrorThrowerServerStubMethods ErrorThrowerServerMethods

// ErrorThrowerServerStub adds universal methods to ErrorThrowerServerStubMethods.
type ErrorThrowerServerStub interface {
	ErrorThrowerServerStubMethods
	// Describe the ErrorThrower interfaces.
	Describe__() []rpc.InterfaceDesc
}

// ErrorThrowerServer returns a server stub for ErrorThrower.
// It converts an implementation of ErrorThrowerServerMethods into
// an object that may be used by rpc.Server.
func ErrorThrowerServer(impl ErrorThrowerServerMethods) ErrorThrowerServerStub {
	stub := implErrorThrowerServerStub{
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

type implErrorThrowerServerStub struct {
	impl ErrorThrowerServerMethods
	gs   *rpc.GlobState
}

func (s implErrorThrowerServerStub) ThrowAborted(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowAborted(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowBadArg(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowBadArg(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowBadProtocol(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowBadProtocol(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowInternal(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowInternal(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowNoAccess(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowNoAccess(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowNoExist(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowNoExist(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowNoExistOrNoAccess(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowNoExistOrNoAccess(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowUnknown(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowUnknown(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowGoError(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowGoError(ctx, call)
}

func (s implErrorThrowerServerStub) ThrowCustomStandardError(ctx *context.T, call rpc.ServerCall) error {
	return s.impl.ThrowCustomStandardError(ctx, call)
}

func (s implErrorThrowerServerStub) Globber() *rpc.GlobState {
	return s.gs
}

func (s implErrorThrowerServerStub) Describe__() []rpc.InterfaceDesc {
	return []rpc.InterfaceDesc{ErrorThrowerDesc}
}

// ErrorThrowerDesc describes the ErrorThrower interface.
var ErrorThrowerDesc rpc.InterfaceDesc = descErrorThrower

// descErrorThrower hides the desc to keep godoc clean.
var descErrorThrower = rpc.InterfaceDesc{
	Name:    "ErrorThrower",
	PkgPath: "v.io/x/js.core/test_service",
	Doc:     "// A testing interface with methods that throw various types of errors",
	Methods: []rpc.MethodDesc{
		{
			Name: "ThrowAborted",
			Doc:  "// Throws v23/vError.Aborted error",
		},
		{
			Name: "ThrowBadArg",
			Doc:  "// Throws v23/vError.BadArg error",
		},
		{
			Name: "ThrowBadProtocol",
			Doc:  "// Throws v23/vError.BadProtocol error",
		},
		{
			Name: "ThrowInternal",
			Doc:  "// Throws v23/vError.Internal error",
		},
		{
			Name: "ThrowNoAccess",
			Doc:  "// Throws v23/vError.NoAccess error",
		},
		{
			Name: "ThrowNoExist",
			Doc:  "// Throws v23/vError.NoExist error",
		},
		{
			Name: "ThrowNoExistOrNoAccess",
			Doc:  "// Throws v23/vError.NoExistOrNoAccess error",
		},
		{
			Name: "ThrowUnknown",
			Doc:  "// Throws v23/vError.Unknown error",
		},
		{
			Name: "ThrowGoError",
			Doc:  "// Throws normal Go error",
		},
		{
			Name: "ThrowCustomStandardError",
			Doc:  "// Throws custom error created by using Standard",
		},
	},
}
