package main

import (
	"errors"

	"v.io/veyron/veyron2/ipc"
	verror "v.io/veyron/veyron2/verror2"

	"test_service"
)

// NewErrorThrower returns a new implementation of ErrorThrowerServerMethods.
func NewErrorThrower() test_service.ErrorThrowerServerMethods {
	return &errorThrowerImpl{}
}

type errorThrowerImpl struct{}

func (e *errorThrowerImpl) ThrowAborted(ctx ipc.ServerContext) error {
	return verror.Make(verror.Aborted, ctx.Context())
}

func (e *errorThrowerImpl) ThrowBadArg(ctx ipc.ServerContext) error {
	return verror.Make(verror.BadArg, ctx.Context())
}

func (e *errorThrowerImpl) ThrowBadProtocol(ctx ipc.ServerContext) error {
	return verror.Make(verror.BadProtocol, ctx.Context())
}

func (e *errorThrowerImpl) ThrowInternal(ctx ipc.ServerContext) error {
	return verror.Make(verror.Internal, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoAccess(ctx ipc.ServerContext) error {
	return verror.Make(verror.NoAccess, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoExist(ctx ipc.ServerContext) error {
	return verror.Make(verror.NoExist, ctx.Context())
}

func (e *errorThrowerImpl) ThrowNoExistOrNoAccess(ctx ipc.ServerContext) error {
	return verror.Make(verror.NoExistOrNoAccess, ctx.Context())
}

func (e *errorThrowerImpl) ThrowUnknown(ctx ipc.ServerContext) error {
	return verror.Make(verror.Unknown, ctx.Context())
}

func (e *errorThrowerImpl) ThrowGoError(ctx ipc.ServerContext) error {
	return errors.New("GoError!")
}

var customError = verror.Register(pkgPath+".customError", verror.NoRetry, "{1:}{2:} CustomStandard!{:_}")

func (e *errorThrowerImpl) ThrowCustomStandardError(ctx ipc.ServerContext) error {
	return verror.Make(customError, ctx.Context())
}

func (e *errorThrowerImpl) ListAllBuiltInErrorIDs(_ ipc.ServerContext) ([]string, error) {
	// TODO(aghassemi) Use when we have enum for error IDs in IDL
	// This is not used yet but the idea is to pass all error types in veyron2/verror to
	// JavaScript so if a new one is added, this test would break and we add the new one to
	// JavaScript as well. There is no way to enumerate all error IDs right now since they
	// are constants and not an Enum. Enum support is coming later.
	return nil, nil
}
