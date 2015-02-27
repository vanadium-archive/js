package main

import (
	"fmt"
	"strings"

	_ "v.io/core/veyron/profiles"
	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/ipc"
	"v.io/v23/naming"
	"v.io/v23/security"

	"test_service"
)

// openAuthorizer allows RPCs from all clients.
type openAuthorizer struct{}

func (openAuthorizer) Authorize(security.Context) error {
	return nil
}

type testServiceDispatcher struct {
	cache           interface{}
	errorThrower    interface{}
	cancelCollector interface{}
	native          interface{}
	caveatedInvoker interface{}
}

func (sd *testServiceDispatcher) Lookup(suffix string) (interface{}, security.Authorizer, error) {
	authorizer := openAuthorizer{}

	if strings.HasPrefix(suffix, "cache") {
		return ipc.ReflectInvokerOrDie(sd.cache), authorizer, nil
	}

	if strings.HasPrefix(suffix, "errorThrower") {
		return ipc.ReflectInvokerOrDie(sd.errorThrower), authorizer, nil
	}

	if strings.HasPrefix(suffix, "serviceToCancel") {
		return ipc.ReflectInvokerOrDie(sd.cancelCollector), authorizer, nil
	}

	if strings.HasPrefix(suffix, "native") {
		fmt.Println("got call to native")
		return ipc.ReflectInvokerOrDie(sd.native), authorizer, nil
	}

	if strings.HasPrefix(suffix, "caveatedInvoker") {
		return ipc.ReflectInvokerOrDie(sd.caveatedInvoker), authorizer, nil
	}

	return ipc.ReflectInvokerOrDie(sd.cache), authorizer, nil
}

func StartServer(ctx *context.T) (ipc.Server, naming.Endpoint, error) {
	// Create a new server instance.
	s, err := v23.NewServer(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failure creating server: %v", err)
	}

	disp := &testServiceDispatcher{
		cache:           test_service.CacheServer(NewCached()),
		errorThrower:    test_service.ErrorThrowerServer(NewErrorThrower()),
		cancelCollector: test_service.CancelCollectorServer(NewCancelCollector()),
		native:          test_service.NativeTestServer(NewNativeTest()),
		caveatedInvoker: test_service.InvokeMethodWithCaveatedIdentityServer(NewInvokeMethodWithCaveatedIdentityServer()),
	}

	// Create an endpoint and begin listening.
	spec := ipc.ListenSpec{Addrs: ipc.ListenAddrs{{"ws", "127.0.0.1:0"}}}
	endpoints, err := s.Listen(spec)
	if err != nil {
		return nil, nil, fmt.Errorf("error listening to service: %v", err)
	}

	// Publish the services. This will register them in the mount table and
	// maintain the registration until StopServing is called.
	if err := s.ServeDispatcher("test_service", disp); err != nil {
		return nil, nil, fmt.Errorf("error publishing service '%s': %v", err)
	}

	return s, endpoints[0], nil
}
