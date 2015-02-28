package main

import (
	"errors"

	"v.io/v23/ipc"
	"v.io/v23/verror"

	"test_service"
)

// NewErrorThrower returns a new implementation of ErrorThrowerServerMethods.
func NewErrorThrower() test_service.ErrorThrowerServerMethods {
	return &errorThrowerImpl{}
}

type errorThrowerImpl struct{}

func (e *errorThrowerImpl) ThrowAborted(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrAborted, ctx.Context())
}

func (e *errorThrowerImpl) ThrowBadArg(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrBadArg, ctx.Context())
}

func (e *errorThrowerImpl) ThrowBadProtocol(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrBadProtocol, ctx.Context())
}

func (e *errorThrowerImpl) ThrowInternal(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrInternal, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoAccess(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrNoAccess, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoExist(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrNoExist, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoExistOrNoAccess(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrNoExistOrNoAccess, ctx.Context())
}

func (e *errorThrowerImpl) ThrowUnknown(ctx ipc.ServerCall) error {
	return verror.New(verror.ErrUnknown, ctx.Context())
}

func (e *errorThrowerImpl) ThrowGoError(ctx ipc.ServerCall) error {
	return errors.New("GoError!")
}

var customError = verror.Register(pkgPath+".customError", verror.NoRetry, "{1:}{2:} CustomStandard!{:_}")

func (e *errorThrowerImpl) ThrowCustomStandardError(ctx ipc.ServerCall) error {
	return verror.New(customError, ctx.Context())
}

func (e *errorThrowerImpl) ListAllBuiltInErrorIDs(_ ipc.ServerCall) ([]string, error) {
	// TODO(aghassemi) Use when we have enum for error IDs in IDL
	// This is not used yet but the idea is to pass all error types in v23/verror to
	// JavaScript so if a new one is added, this test would break and we add the new one to
	// JavaScript as well. There is no way to enumerate all error IDs right now since they
	// are constants and not an Enum. Enum support is coming later.
	return nil, nil
}
