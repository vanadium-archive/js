package main

import (
	"fmt"
	"strings"

	_ "veyron.io/veyron/veyron/profiles"
	"veyron.io/veyron/veyron2"
	"veyron.io/veyron/veyron2/ipc"
	"veyron.io/veyron/veyron2/naming"
	"veyron.io/veyron/veyron2/security"

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
}

func (sd *testServiceDispatcher) Lookup(suffix string) (interface{}, security.Authorizer, error) {
	authorizer := openAuthorizer{}

	if strings.HasPrefix(suffix, "cache") {
		return ipc.ReflectInvoker(sd.cache), authorizer, nil
	}

	if strings.HasPrefix(suffix, "errorThrower") {
		return ipc.ReflectInvoker(sd.errorThrower), authorizer, nil
	}

	if strings.HasPrefix(suffix, "serviceToCancel") {
		return ipc.ReflectInvoker(sd.cancelCollector), authorizer, nil
	}

	return ipc.ReflectInvoker(sd.cache), authorizer, nil
}

func StartServer(r veyron2.Runtime) (ipc.Server, naming.Endpoint, error) {
	// Create a new server instance.
	s, err := r.NewServer()
	if err != nil {
		return nil, nil, fmt.Errorf("failure creating server: %v", err)
	}

	disp := &testServiceDispatcher{
		cache:           test_service.CacheServer(NewCached()),
		errorThrower:    test_service.ErrorThrowerServer(NewErrorThrower()),
		cancelCollector: test_service.CancelCollectorServer(NewCancelCollector()),
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
