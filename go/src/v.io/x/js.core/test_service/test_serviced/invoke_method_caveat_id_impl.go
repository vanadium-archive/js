// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/security"
	"v.io/v23/vdl"
	"v.io/v23/vom"
	"v.io/x/js.core/test_service"
	vsecurity "v.io/x/ref/lib/security"
)

type invokeMethWCavIdImpl struct{}

var _ test_service.InvokeMethodWithCaveatedIdentityServerMethods = (*invokeMethWCavIdImpl)(nil)

func NewInvokeMethodWithCaveatedIdentityServer() test_service.InvokeMethodWithCaveatedIdentityServerMethods {
	return &invokeMethWCavIdImpl{}
}

// Invoke is a method on the InvokeMethodWithCaveatedIdentity service that
// invokes "AMethod" on the service with the provided name with an identity
// blessed with a caveat with the provided CaveatDescriptor.
func (i *invokeMethWCavIdImpl) Invoke(ctx *context.T, call rpc.ServerCall, name string, cavDesc security.CaveatDescriptor, cavParam *vdl.Value) error {
	bytes, err := vom.Encode(cavParam)
	if err != nil {
		return err
	}

	cav := security.Caveat{
		Id:       cavDesc.Id,
		ParamVom: bytes,
	}
	p := v23.GetPrincipal(ctx)
	other, _ := security.RemoteBlessingNames(ctx, call.Security())
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
	ctxWithCaveats, err := v23.WithPrincipal(ctx, pWithCaveats)
	if err != nil {
		return err
	}

	str, err := client.AMethod(ctxWithCaveats)
	if err != nil {
		return err
	}
	if str != "aResult" {
		return fmt.Errorf("Got wrong result %q", str)
	}
	return nil
}
