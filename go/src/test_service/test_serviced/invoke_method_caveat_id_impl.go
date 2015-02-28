package main

import (
	"test_service"

	vsecurity "v.io/core/veyron/security"

	"v.io/v23"
	"v.io/v23/ipc"
	"v.io/v23/security"
	"v.io/v23/vdl"
	"v.io/v23/vom"
)

type invokeMethWCavIdImpl struct{}

var _ test_service.InvokeMethodWithCaveatedIdentityServerMethods = (*invokeMethWCavIdImpl)(nil)

func NewInvokeMethodWithCaveatedIdentityServer() test_service.InvokeMethodWithCaveatedIdentityServerMethods {
	return &invokeMethWCavIdImpl{}
}

// Invoke is a method on the InvokeMethodWithCaveatedIdentity service that
// invokes "AMethod" on the service with the provided name with an identity
// blessed with a caveat with the provided CaveatDescriptor.
func (i *invokeMethWCavIdImpl) Invoke(servCtx ipc.ServerCall, name string, cavDesc security.CaveatDescriptor, cavParam *vdl.Value) error {
	ctx := servCtx.Context()

	bytes, err := vom.Encode(cavParam)
	if err != nil {
		return err
	}

	cav := security.Caveat{
		Id:       cavDesc.Id,
		ParamVom: bytes,
	}
	p := v23.GetPrincipal(ctx)
	other, _ := servCtx.RemoteBlessings().ForCall(servCtx)
	sharedWithOther := p.BlessingStore().ForPeer(other...)

	pWithCaveats, err := vsecurity.NewPrincipal()
	if err != nil {
		return err
	}
	// The "child" extension below is necessary for the blessing to be authorized
	// at the JavaScript server (which uses the default authorization policy).
	b, err := p.Bless(pWithCaveats.PublicKey(), sharedWithOther, "child", cav)
	if err != nil {
		return err
	}
	if err := vsecurity.SetDefaultBlessings(pWithCaveats, b); err != nil {
		return err
	}

	client := test_service.InvokableTestMethodClient(name)
	ctxWithCaveats, err := v23.SetPrincipal(ctx, pWithCaveats)
	if err != nil {
		return err
	}

	return client.AMethod(ctxWithCaveats)
}
