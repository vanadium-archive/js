package main

import (
	"fmt"
	"strings"

	"veyron.io/veyron/veyron2"
	"veyron.io/veyron/veyron2/ipc"
	"veyron.io/veyron/veyron2/naming"
	"veyron.io/veyron/veyron2/security"

	"wspr_sample"
)

type sampleDispatcher struct {
	cache        interface{}
	errorThrower interface{}
}

func (sd *sampleDispatcher) Lookup(suffix, method string) (ipc.Invoker, security.Authorizer, error) {
	if strings.HasPrefix(suffix, "cache") {
		return ipc.ReflectInvoker(sd.cache), nil, nil
	}

	if strings.HasPrefix(suffix, "errorThrower") {
		return ipc.ReflectInvoker(sd.errorThrower), nil, nil
	}

	return ipc.ReflectInvoker(sd.cache), nil, nil
}

func StartServer(r veyron2.Runtime) (ipc.Server, naming.Endpoint, error) {
	// Create a new server instance.
	s, err := r.NewServer()
	if err != nil {
		return nil, nil, fmt.Errorf("failure creating server: %v", err)
	}

	disp := &sampleDispatcher{
		cache:        wspr_sample.NewServerCache(NewCached()),
		errorThrower: wspr_sample.NewServerErrorThrower(NewErrorThrower()),
	}

	// Create an endpoint and begin listening.
	endpoint, err := s.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, nil, fmt.Errorf("error listening to service: %v", err)
	}

	// Publish the cache service. This will register it in the mount table and
	// maintain the registration until StopServing is called.
	if err := s.Serve("sample", disp); err != nil {
		return nil, nil, fmt.Errorf("error publishing service: %v", err)
	}

	if err := s.Serve("cache", disp); err != nil {
		return nil, nil, fmt.Errorf("error publishing service: %v", err)
	}

	return s, endpoint, nil
}
