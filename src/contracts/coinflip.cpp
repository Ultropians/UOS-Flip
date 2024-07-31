#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>

using namespace eosio;

class [[eosio::contract("coinflip")]] coinflip : public contract {
public:
    using contract::contract;

    // Constructor
    coinflip(name receiver, name code, datastream<const char*> ds) : contract(receiver, code, ds) {}

    // Handler for incoming token transfers
    [[eosio::on_notify("eosio.token::transfer")]]
    void on_transfer(name from, name to, asset quantity, std::string memo) {
        if (to != get_self() || from == get_self()) return;

        check(memo == "heads" || memo == "tails", "Invalid memo. Use 'heads' or 'tails' only.");
        bool is_heads = (memo == "heads");
        
        execute_flip(from, quantity, is_heads);
    }

    // Main game logic
    void execute_flip(name player, asset bet, bool is_heads) {
        check(bet.symbol == symbol("UOS", 8), "Only UOS tokens are accepted");
        check(bet.amount > 0, "Bet amount must be positive");
        check(bet.amount <= get_max_bet().amount, "Bet exceeds maximum allowed");

        asset contract_balance = get_balance(get_self());
        // New check to ensure contract has sufficient funds
        check(contract_balance >= bet * 2, "Contract doesn't have enough balance to cover potential winnings");

        bool result = generate_random_bool();
        bool won = (result == is_heads);

        asset payout = won ? calculate_payout(bet) : asset(0, bet.symbol);

        record_game_result(player, bet, is_heads, won, payout);

        if (won) {
            action(
                permission_level{get_self(), "active"_n},
                "eosio.token"_n,
                "transfer"_n,
                std::make_tuple(get_self(), player, payout, std::string("Coinflip winnings"))
            ).send();
        }
    }

    // Action to set the maximum bet
    [[eosio::action]]
    void setmaxbet(asset new_max_bet) {
        require_auth(get_self());
        config_table config(get_self(), get_self().value);
        auto itr = config.find(0);
        if (itr == config.end()) {
            config.emplace(get_self(), [&](auto& c) {
                c.id = 0;
                c.max_bet = new_max_bet;
            });
        } else {
            config.modify(itr, get_self(), [&](auto& c) {
                c.max_bet = new_max_bet;
            });
        }
    }

    // Action to set the house edge
    [[eosio::action]]
    void sethouseedge(uint16_t new_house_edge_pct) {
        require_auth(get_self());
        config_table config(get_self(), get_self().value);
        auto itr = config.find(0);
        if (itr == config.end()) {
            config.emplace(get_self(), [&](auto& c) {
                c.id = 0;
                c.house_edge_pct = new_house_edge_pct;
            });
        } else {
            config.modify(itr, get_self(), [&](auto& c) {
                c.house_edge_pct = new_house_edge_pct;
            });
        }
    }

private:
    // Table to store game results
    struct [[eosio::table]] game_result {
        uint64_t id;
        name player;
        asset bet;
        bool is_heads;
        bool won;
        asset payout;
        time_point_sec timestamp;

        uint64_t primary_key() const { return id; }
    };

    // Table to store contract configuration
    struct [[eosio::table]] config {
        uint64_t id;
        asset max_bet;
        uint16_t house_edge_pct;

        uint64_t primary_key() const { return id; }
    };

    // Table to store account balances (from eosio.token contract)
    struct [[eosio::table]] account {
        asset balance;
        uint64_t primary_key() const { return balance.symbol.code().raw(); }
    };

    typedef eosio::multi_index<"results"_n, game_result> results_table;
    typedef eosio::multi_index<"config"_n, config> config_table;
    typedef eosio::multi_index<"accounts"_n, account> accounts_table;

    // Generate random boolean for coin flip result
    bool generate_random_bool() {
        uint64_t seed = current_time_point().time_since_epoch().count();
        return (current_time_point().sec_since_epoch() + seed) % 2 == 0;
    }

    // Get maximum allowed bet
    asset get_max_bet() {
        config_table config(get_self(), get_self().value);
        auto itr = config.find(0);
        if (itr != config.end()) {
            return itr->max_bet;
        }
        return asset(1000000000000, symbol("UOS", 8)); // Default 10000 UOS if not set
    }

    // Calculate payout including house edge
    asset calculate_payout(const asset& bet) {
        config_table config(get_self(), get_self().value);
        auto itr = config.find(0);
        uint16_t house_edge_pct = (itr != config.end()) ? itr->house_edge_pct : 200; // Default 2% if not set
        asset winnings = bet;
        asset house_edge = (winnings * house_edge_pct) / 10000;
        return bet + winnings - house_edge; // Initial bet + winnings - house edge
    }

    // Get balance of an account
    asset get_balance(name account) {
        symbol sym(symbol_code("UOS"), 8);
        accounts_table accountstable("eosio.token"_n, account.value);
        auto itr = accountstable.find(sym.code().raw());
        if (itr != accountstable.end()) {
            return itr->balance;
        }
        return asset(0, sym);
    }

    // Record game result in the results table
    void record_game_result(name player, asset bet, bool is_heads, bool won, asset payout) {
        results_table results(get_self(), get_self().value);
        results.emplace(get_self(), [&](auto& r) {
            r.id = results.available_primary_key();
            r.player = player;
            r.bet = bet;
            r.is_heads = is_heads;
            r.won = won;
            r.payout = payout;
            r.timestamp = current_time_point();
        });
    }
};
