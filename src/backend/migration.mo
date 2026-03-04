import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";

module {
  type OldActor = {};
  type NewActor = {
    aiSearchHistory : Map.Map<Principal, List.List<{ searchQuery : Text; timestamp : Int }>>;
  };

  public func run(_ : OldActor) : NewActor {
    { aiSearchHistory = Map.empty<Principal, List.List<{ searchQuery : Text; timestamp : Int }>>() };
  };
};
