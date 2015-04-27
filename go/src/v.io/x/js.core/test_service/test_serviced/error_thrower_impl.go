// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"errors"

	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/verror"
	"v.io/x/js.core/test_service"
)

// NewErrorThrower returns a new implementation of ErrorThrowerServerMethods.
func NewErrorThrower() test_service.ErrorThrowerServerMethods {
	return &errorThrowerImpl{}
}

type errorThrowerImpl struct{}

func (e *errorThrowerImpl) ThrowAborted(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrAborted, ctx)
}

func (e *errorThrowerImpl) ThrowBadArg(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrBadArg, ctx)
}

func (e *errorThrowerImpl) ThrowBadProtocol(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrBadProtocol, ctx)
}

func (e *errorThrowerImpl) ThrowInternal(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrInternal, ctx)
}

func (e *errorThrowerImpl) ThrowNoAccess(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrNoAccess, ctx)
}

func (e *errorThrowerImpl) ThrowNoExist(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrNoExist, ctx)
}

func (e *errorThrowerImpl) ThrowNoExistOrNoAccess(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrNoExistOrNoAccess, ctx)
}

func (e *errorThrowerImpl) ThrowUnknown(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(verror.ErrUnknown, ctx)
}

func (e *errorThrowerImpl) ThrowGoError(*context.T, rpc.ServerCall) error {
	return errors.New("GoError!")
}

var customError = verror.Register(pkgPath+".customError", verror.NoRetry, "{1:}{2:} CustomStandard!{:_}")

func (e *errorThrowerImpl) ThrowCustomStandardError(ctx *context.T, _ rpc.ServerCall) error {
	return verror.New(customError, ctx)
}
