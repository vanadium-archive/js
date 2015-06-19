// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"fmt"
	"strings"

	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/security"
	"v.io/x/js.core/test_service"
	_ "v.io/x/ref/runtime/factories/generic"
)

// openAuthorizer allows RPCs from all clients.
type openAuthorizer struct{}

func (openAuthorizer) Authorize(*context.T, security.Call) error {
	return nil
}

type testServiceDispatcher struct {
	cache           interface{}
	errorThrower    interface{}
	cancelCollector interface{}
	native          interface{}
	caveatedInvoker interface{}
}

func NewDispatcher() rpc.Dispatcher {
	disp := &testServiceDispatcher{
		cache:           test_service.CacheServer(NewCached()),
		errorThrower:    test_service.ErrorThrowerServer(NewErrorThrower()),
		cancelCollector: test_service.CancelCollectorServer(NewCancelCollector()),
		native:          test_service.NativeTestServer(NewNativeTest()),
		caveatedInvoker: test_service.InvokeMethodWithCaveatedIdentityServer(NewInvokeMethodWithCaveatedIdentityServer()),
	}
	return disp
}

func (sd *testServiceDispatcher) Lookup(suffix string) (interface{}, security.Authorizer, error) {
	authorizer := openAuthorizer{}

	if strings.HasPrefix(suffix, "cache") {
		return rpc.ReflectInvokerOrDie(sd.cache), authorizer, nil
	}

	if strings.HasPrefix(suffix, "errorThrower") {
		return rpc.ReflectInvokerOrDie(sd.errorThrower), authorizer, nil
	}

	if strings.HasPrefix(suffix, "serviceToCancel") {
		return rpc.ReflectInvokerOrDie(sd.cancelCollector), authorizer, nil
	}

	if strings.HasPrefix(suffix, "native") {
		fmt.Println("got call to native")
		return rpc.ReflectInvokerOrDie(sd.native), authorizer, nil
	}

	if strings.HasPrefix(suffix, "caveatedInvoker") {
		return rpc.ReflectInvokerOrDie(sd.caveatedInvoker), authorizer, nil
	}

	return rpc.ReflectInvokerOrDie(sd.cache), authorizer, nil
}
