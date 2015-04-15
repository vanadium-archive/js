// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"errors"

	"v.io/v23/rpc"
	"v.io/v23/verror"
	"v.io/x/js.core/test_service"
)

// NewErrorThrower returns a new implementation of ErrorThrowerServerMethods.
func NewErrorThrower() test_service.ErrorThrowerServerMethods {
	return &errorThrowerImpl{}
}

type errorThrowerImpl struct{}

func (e *errorThrowerImpl) ThrowAborted(call rpc.ServerCall) error {
	return verror.New(verror.ErrAborted, call.Context())
}

func (e *errorThrowerImpl) ThrowBadArg(call rpc.ServerCall) error {
	return verror.New(verror.ErrBadArg, call.Context())
}

func (e *errorThrowerImpl) ThrowBadProtocol(call rpc.ServerCall) error {
	return verror.New(verror.ErrBadProtocol, call.Context())
}

func (e *errorThrowerImpl) ThrowInternal(call rpc.ServerCall) error {
	return verror.New(verror.ErrInternal, call.Context())
}

func (e *errorThrowerImpl) ThrowNoAccess(call rpc.ServerCall) error {
	return verror.New(verror.ErrNoAccess, call.Context())
}

func (e *errorThrowerImpl) ThrowNoExist(call rpc.ServerCall) error {
	return verror.New(verror.ErrNoExist, call.Context())
}

func (e *errorThrowerImpl) ThrowNoExistOrNoAccess(call rpc.ServerCall) error {
	return verror.New(verror.ErrNoExistOrNoAccess, call.Context())
}

func (e *errorThrowerImpl) ThrowUnknown(call rpc.ServerCall) error {
	return verror.New(verror.ErrUnknown, call.Context())
}

func (e *errorThrowerImpl) ThrowGoError(call rpc.ServerCall) error {
	return errors.New("GoError!")
}

var customError = verror.Register(pkgPath+".customError", verror.NoRetry, "{1:}{2:} CustomStandard!{:_}")

func (e *errorThrowerImpl) ThrowCustomStandardError(call rpc.ServerCall) error {
	return verror.New(customError, call.Context())
}

func (e *errorThrowerImpl) ListAllBuiltInErrorIds(_ rpc.ServerCall) ([]string, error) {
	// TODO(aghassemi) Use when we have enum for error IDs in IDL
	// This is not used yet but the idea is to pass all error types in v23/verror to
	// JavaScript so if a new one is added, this test would break and we add the new one to
	// JavaScript as well. There is no way to enumerate all error IDs right now since they
	// are constants and not an Enum. Enum support is coming later.
	return nil, nil
}
